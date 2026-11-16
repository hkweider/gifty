/**
 * Gift chat (server side). Answers questions about one product for one person, grounded in the
 * product data Gifty already has from Shopify Catalog. Reads ANTHROPIC_API_KEY from the server
 * environment; the key never reaches the browser.
 */
import Anthropic from '@anthropic-ai/sdk';
import { UcpError } from './ucp.js';

export interface ChatContext {
  person: { name: string; relationship: string; summary: string; interests: string[]; avoids: string[]; owns: string[] };
  occasion: { name: string; date: string; budget: number };
  product?: {
    name: string; store: string; price: number; listPrice?: number; currency: string; description?: string;
    rating?: { value: number; count: string }; variant?: string; inStock?: boolean; shipsToCanada?: boolean;
    subscriptionOnly?: boolean; url?: string;
  };
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

// Stable instructions first so the prefix caches across turns; per-request context goes in messages.
const SYSTEM = `You are Gifty's gift assistant. You help one shopper decide whether a specific product is a good gift for a specific person.

Use only the facts in the provided context: the person's profile, the occasion and budget, and the product data from the store's Shopify catalog listing. If the answer isn't in that data (for example exact delivery dates, materials not listed, or what reviewers said), say you don't know rather than guessing, and suggest how the shopper could find out (the store page, or checkout for delivery dates).

Keep replies short and conversational: 2 to 5 sentences, or a few short bullet points when comparing. Plain text, no headings. Prices are in the currency given. Don't invent reviews, ratings, discounts or stock levels.`;

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new UcpError('Chat is not set up: ANTHROPIC_API_KEY is missing on the server.', 503);
  client ??= new Anthropic();
  return client;
}

function contextBlock(c: ChatContext) {
  const p = c.product;
  const lines = [
    `Person: ${c.person.name} (${c.person.relationship}). ${c.person.summary || ''}`.trim(),
    c.person.interests.length ? `Interests: ${c.person.interests.join(', ')}` : '',
    c.person.avoids.length ? `Avoids: ${c.person.avoids.join(', ')}` : '',
    c.person.owns.length ? `Already owns: ${c.person.owns.join(', ')}` : '',
    `Occasion: ${c.occasion.name} on ${c.occasion.date}. Budget for this person: ${c.occasion.budget > 0 ? `${c.occasion.budget} CAD` : 'not set'}.`,
  ];
  if (p) {
    lines.push(
      '',
      `Product: ${p.name}`,
      `Sold by: ${p.store}`,
      `Price: ${p.price.toFixed(2)} ${p.currency}${p.listPrice && p.listPrice > p.price ? ` (was ${p.listPrice.toFixed(2)})` : ''}`,
      p.variant ? `Selected option: ${p.variant}` : '',
      p.inStock === undefined ? '' : `In stock: ${p.inStock ? 'yes' : 'no'}`,
      p.shipsToCanada === undefined ? '' : `Ships to Canada: ${p.shipsToCanada ? 'yes' : 'no'}`,
      p.subscriptionOnly ? 'Subscription only: yes' : '',
      p.rating ? `Store rating: ${p.rating.value} out of 5 from ${p.rating.count} ratings` : 'Store rating: none found',
      p.description ? `Description: ${p.description.slice(0, 2500)}` : '',
    );
  }
  return lines.filter((l) => l !== '').join('\n');
}

export async function chat(input: { messages: ChatTurn[]; context: ChatContext }) {
  const turns = (input.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!turns.length || turns[turns.length - 1].role !== 'user') throw new UcpError('A user message is required', 400);
  if (!input.context?.person || !input.context?.occasion) throw new UcpError('Chat context is required', 400);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: `Context for this conversation:\n${contextBlock(input.context)}` },
    { role: 'assistant', content: 'Got it. What would you like to know?' },
    ...turns,
  ];

  try {
    const response = await getClient().beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low' }, // short chat answers; raise if quality needs it
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // if the model declines on a policy check, retry on a fallback model
      messages,
    });
    if (response.stop_reason === 'refusal') {
      return { reply: "Sorry, I can't help with that one. Try asking about the product, the price or whether it suits the person." };
    }
    const reply = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
    return { reply: reply || "Sorry, I didn't get an answer. Please try again." };
  } catch (e) {
    if (e instanceof UcpError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new UcpError('Chat key was rejected. Check ANTHROPIC_API_KEY.', 503);
    if (e instanceof Anthropic.RateLimitError) throw new UcpError('Chat is busy right now. Try again in a moment.', 429);
    if (e instanceof Anthropic.APIError) throw new UcpError(`Chat error (${e.status ?? 'network'}). Try again.`, 502);
    throw e;
  }
}

/* ---------- Refine recommendations through conversation ---------- */

export interface RefineInput {
  messages: ChatTurn[];
  person: ChatContext['person'];
  occasion: ChatContext['occasion'];
  current: { query?: string; maxBudget?: number | null; skip?: string[]; shown?: string[] };
}

export interface RefineResult {
  reply: string;
  /** New catalog search to run, or null to keep the current results. */
  query: string | null;
  /** Max price in CAD, or null for no change. Use 0 to remove the limit. */
  maxBudget: number | null;
  /** Words to filter out of product names (e.g. "kettle"). */
  skip: string[];
  /** One-line summary of what changed, for the "Changed:" notice. */
  changed: string | null;
}

const REFINE_SYSTEM = `You help a shopper refine gift ideas for one person in Gifty. Each turn, read what the shopper wants and decide how to change the product results, then reply briefly.

You control the results through these fields:
- query: a short Shopify catalog search phrase (3 to 6 words, plain product words, e.g. "personalized gardening tool set") when the shopper wants different kinds of products. Use null to keep the current results.
- maxBudget: a maximum price in CAD when the shopper mentions a budget. 0 removes the limit. null leaves it unchanged.
- skip: single words to hide from product names (e.g. "kettle", "mug") when the shopper rules something out. Empty array if none.
- changed: a short summary of what you changed (e.g. "Budget ≤ $60 · searching personalized gardening gifts"), or null if nothing changed.
- reply: 1 to 3 short sentences to the shopper saying what you did, or asking one clarifying question if the request is unclear. Plain text.

Base search phrases on the person's interests and what the shopper says. Don't name specific products or prices in your reply; the results will show them.`;

const REFINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'query', 'maxBudget', 'skip', 'changed'],
  properties: {
    reply: { type: 'string' },
    query: { type: ['string', 'null'] },
    maxBudget: { type: ['number', 'null'] },
    skip: { type: 'array', items: { type: 'string' } },
    changed: { type: ['string', 'null'] },
  },
};

export async function refine(input: RefineInput): Promise<RefineResult> {
  const turns = (input.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!turns.length || turns[turns.length - 1].role !== 'user') throw new UcpError('A user message is required', 400);
  if (!input.person || !input.occasion) throw new UcpError('Context is required', 400);

  const c = input.current ?? {};
  const state = [
    contextBlock({ person: input.person, occasion: input.occasion }),
    '',
    `Current search: ${c.query ? `"${c.query}"` : 'ideas from their interests'}`,
    `Current max price: ${c.maxBudget ? `${c.maxBudget} CAD` : 'none'}`,
    c.skip?.length ? `Currently hidden words: ${c.skip.join(', ')}` : '',
    c.shown?.length ? `Products currently shown: ${c.shown.slice(0, 12).join('; ')}` : '',
  ].filter(Boolean).join('\n');

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: `Context:\n${state}` },
    { role: 'assistant', content: '{"reply":"Ready.","query":null,"maxBudget":null,"skip":[],"changed":null}' },
    ...turns,
  ];

  try {
    const response = await getClient().beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      system: [{ type: 'text', text: REFINE_SYSTEM, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: REFINE_SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages,
    });
    if (response.stop_reason === 'refusal') {
      return { reply: "Sorry, I can't help with that. Try describing the kind of gift you want.", query: null, maxBudget: null, skip: [], changed: null };
    }
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const out = JSON.parse(text) as RefineResult;
    return {
      reply: String(out.reply ?? '').slice(0, 600),
      query: typeof out.query === 'string' && out.query.trim() ? out.query.trim().slice(0, 80) : null,
      maxBudget: typeof out.maxBudget === 'number' && out.maxBudget >= 0 ? Math.round(out.maxBudget) : null,
      skip: Array.isArray(out.skip) ? out.skip.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim().toLowerCase()).slice(0, 8) : [],
      changed: typeof out.changed === 'string' && out.changed.trim() ? out.changed.trim().slice(0, 140) : null,
    };
  } catch (e) {
    if (e instanceof UcpError) throw e;
    if (e instanceof SyntaxError) throw new UcpError('Could not read the refinement. Try again.', 502);
    if (e instanceof Anthropic.AuthenticationError) throw new UcpError('Chat key was rejected. Check ANTHROPIC_API_KEY.', 503);
    if (e instanceof Anthropic.RateLimitError) throw new UcpError('Chat is busy right now. Try again in a moment.', 429);
    if (e instanceof Anthropic.APIError) throw new UcpError(`Chat error (${e.status ?? 'network'}). Try again.`, 502);
    throw e;
  }
}
