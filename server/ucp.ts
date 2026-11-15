/**
 * Shopify UCP client (server side). Talks JSON-RPC to:
 *   - Global Catalog:  https://catalog.shopify.com/api/ucp/mcp   (search_catalog, get_product)
 *   - Merchant Cart:   https://{shop-domain}/api/ucp/mcp          (create_cart)
 * Docs: https://shopify.dev/docs/agents/catalog/global-catalog
 *       https://shopify.dev/docs/agents/carts-and-checkout/cart-mcp
 *
 * Auth: requests run in the Anonymous tier unless SHOPIFY_UCP_TOKEN is set (a bearer token from
 * Dev Dashboard → Catalogs). Anonymous has the lowest, shared rate limits and is not meant for
 * production traffic. Every request names an agent profile (UCP_AGENT_PROFILE); the default is
 * Shopify's hosted example profile. Host your own before launch.
 */

const CATALOG_ENDPOINT = 'https://catalog.shopify.com/api/ucp/mcp';
const DEFAULT_PROFILE = 'https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json';

const profile = () => process.env.UCP_AGENT_PROFILE || DEFAULT_PROFILE;
const token = () => process.env.SHOPIFY_UCP_TOKEN || '';

export class UcpError extends Error {
  constructor(message: string, public status = 502, public retryAfter?: number) { super(message); }
}

interface Money { amount: number; currency: string }
interface UcpVariant {
  id: string; title?: string; price?: Money; list_price?: Money; checkout_url?: string;
  availability?: { available?: boolean };
  options?: { name: string; label: string }[];
  seller?: { name?: string; domain?: string; url?: string; links?: { type: string; url: string }[] };
}
interface UcpProduct {
  id: string; title: string; url?: string;
  description?: { html?: string; plain?: string };
  media?: { type: string; url: string; alt_text?: string }[];
  options?: { name: string; values: { label: string }[] }[];
  variants?: UcpVariant[];
  rating?: { value: number; scale_max?: number; count?: number };
  metadata?: { top_features?: string[] };
}

/** Shape the UI uses. Prices are in major units (e.g. 89.00). */
export interface LiveProduct {
  id: string;            // UPID, gid://shopify/p/…
  variantId: string;     // gid://shopify/ProductVariant/… (pass back to carts exactly as returned)
  name: string;
  store: string;
  storeDomain: string;
  price: number;
  listPrice?: number;
  currency: string;
  blurb: string;
  description: string;
  image?: string;
  images: string[];
  url?: string;
  checkoutUrl?: string;
  refundPolicyUrl?: string;
  rating?: { value: number; count: number };
  variants: { id: string; title: string; available: boolean; price: number }[];
  features: string[];
}

let rpcId = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retries rate-limited calls (HTTP 429) with Retry-After / exponential backoff and jitter. */
async function callTool<T>(endpoint: string, name: string, args: Record<string, unknown>, buyerIp?: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callToolOnce<T>(endpoint, name, args, buyerIp);
    } catch (e) {
      if (!(e instanceof UcpError) || e.status !== 429 || attempt >= 3) throw e;
      const wait = e.retryAfter ? e.retryAfter * 1000 : 500 * 2 ** attempt;
      await sleep(Math.min(wait, 8000) + Math.random() * 250);
    }
  }
}

async function callToolOnce<T>(endpoint: string, name: string, args: Record<string, unknown>, buyerIp?: string): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
  const auth = token();
  if (auth) {
    headers.authorization = `Bearer ${auth}`;
    // Token-tier calls to merchant endpoints must carry the buyer's IP.
    if (endpoint !== CATALOG_ENDPOINT && buyerIp) headers['Shopify-Buyer-IP'] = buyerIp;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'tools/call', id: ++rpcId,
      params: { name, arguments: { meta: { 'ucp-agent': { profile: profile() } }, ...args } },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 429) throw new UcpError('Shopify rate limit reached. Try again shortly.', 429, Number(res.headers.get('retry-after')) || undefined);
  if (!res.ok) throw new UcpError(`Shopify returned HTTP ${res.status}`);
  const body = await res.json() as { error?: { message?: string }; result?: { isError?: boolean; structuredContent?: T; content?: { text?: string }[] } };
  if (body.error) throw new UcpError(body.error.message ?? 'Shopify UCP error');
  if (body.result?.isError) throw new UcpError(body.result.content?.[0]?.text ?? 'Shopify UCP tool error');
  if (!body.result?.structuredContent) throw new UcpError('Empty response from Shopify UCP');
  return body.result.structuredContent;
}

const major = (m?: Money) => (m ? m.amount / 100 : 0);
const stripHtml = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const firstSentence = (s: string) => {
  const m = s.match(/^(.{20,110}?[.!?])\s/);
  return m ? m[1] : s.length > 90 ? `${s.slice(0, 87).trimEnd()}…` : s;
};

export function normalize(p: UcpProduct): LiveProduct | null {
  const variants = p.variants ?? [];
  const v = variants.find((x) => x.availability?.available !== false) ?? variants[0];
  if (!v?.price || !v.seller?.domain) return null;
  const description = stripHtml(p.description?.plain ?? p.description?.html);
  const images = (p.media ?? []).filter((m) => m.type === 'image').map((m) => m.url);
  return {
    id: p.id,
    variantId: v.id,
    name: p.title,
    store: v.seller.name ?? v.seller.domain,
    storeDomain: v.seller.domain,
    price: major(v.price),
    listPrice: v.list_price ? major(v.list_price) : undefined,
    currency: v.price.currency,
    blurb: firstSentence(description) || v.title || '',
    description,
    image: images[0],
    images,
    url: p.url,
    checkoutUrl: v.checkout_url,
    refundPolicyUrl: v.seller.links?.find((l) => l.type === 'refund_policy')?.url,
    rating: p.rating?.count ? { value: p.rating.value, count: p.rating.count } : undefined,
    variants: variants.slice(0, 12).map((x) => ({ id: x.id, title: x.title ?? '', available: x.availability?.available !== false, price: major(x.price) })),
    features: p.metadata?.top_features?.slice(0, 4) ?? [],
  };
}

export interface SearchInput {
  query: string;
  maxPrice?: number;        // major units
  country?: string;         // ISO alpha-2, default CA
  currency?: string;        // default CAD
  intent?: string;          // free-text buyer context, e.g. a person's profile
  limit?: number;
  cursor?: string;
}

const searchCache = new Map<string, { at: number; value: Awaited<ReturnType<typeof searchUncached>> }>();
const SEARCH_TTL = 10 * 60 * 1000;

/** Search with a 10-minute in-memory cache, so repeat page views don't spend rate limit. */
export async function searchCatalog(input: SearchInput) {
  const key = JSON.stringify([input.query, input.maxPrice, input.country, input.currency, input.intent, input.limit, input.cursor]);
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.value;
  const value = await searchUncached(input);
  searchCache.set(key, { at: Date.now(), value });
  if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value!);
  return value;
}

async function searchUncached(input: SearchInput) {
  if (!input.query?.trim()) throw new UcpError('A search query is required', 400);
  const country = input.country ?? 'CA';
  const sc = await callTool<{ products?: UcpProduct[]; pagination?: { cursor?: string; has_next_page?: boolean; total_count?: number } }>(
    CATALOG_ENDPOINT, 'search_catalog', {
      catalog: {
        query: input.query.slice(0, 200),
        context: { address_country: country, currency: input.currency ?? 'CAD', ...(input.intent ? { intent: input.intent.slice(0, 300) } : {}) },
        filters: {
          available: true,
          ships_to: { country },
          ...(input.maxPrice && Number.isFinite(input.maxPrice) ? { price: { max: Math.round(input.maxPrice * 100) } } : {}),
        },
        pagination: { limit: Math.min(Math.max(input.limit ?? 12, 1), 50), ...(input.cursor ? { cursor: input.cursor } : {}) },
      },
    });
  return {
    products: (sc.products ?? []).map(normalize).filter((x): x is LiveProduct => !!x),
    cursor: sc.pagination?.has_next_page ? sc.pagination.cursor : undefined,
    total: sc.pagination?.total_count,
  };
}

export async function getProduct(id: string, country = 'CA') {
  const sc = await callTool<{ product?: UcpProduct }>(CATALOG_ENDPOINT, 'get_product', {
    catalog: { id, context: { address_country: country, currency: 'CAD' } },
  });
  const p = sc.product && normalize(sc.product);
  if (!p) throw new UcpError('Product not found', 404);
  return p;
}

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/**
 * Creates a cart at one merchant (one checkout step in the UI) and returns its continue_url,
 * which opens that store's checkout. If the merchant's Cart MCP is unreachable, falls back to a
 * standard Shopify cart permalink built from the variant ids.
 */
export async function createCart(input: { storeDomain: string; lines: { variantId: string; quantity: number }[]; country?: string }, buyerIp?: string) {
  if (!DOMAIN.test(input.storeDomain)) throw new UcpError('Invalid store domain', 400);
  const lines = (input.lines ?? []).filter((l) => /^gid:\/\/shopify\/ProductVariant\/\d+/.test(l.variantId) && l.quantity > 0);
  if (!lines.length) throw new UcpError('No valid cart lines', 400);
  try {
    const sc = await callTool<{ id: string; continue_url?: string; totals?: { type: string; amount: number }[]; currency?: string; messages?: { type: string; content: string }[] }>(
      `https://${input.storeDomain}/api/ucp/mcp`, 'create_cart', {
        cart: {
          line_items: lines.map((l) => ({ item: { id: l.variantId }, quantity: Math.min(l.quantity, 10) })),
          context: { address_country: input.country ?? 'CA' },
        },
      }, buyerIp);
    if (!sc.continue_url) throw new UcpError('Cart has no continue_url');
    const total = sc.totals?.find((t) => t.type === 'total');
    return { cartId: sc.id, continueUrl: sc.continue_url, total: total ? total.amount / 100 : undefined, currency: sc.currency, source: 'cart_mcp' as const, messages: sc.messages ?? [] };
  } catch (e) {
    const permalink = `https://${input.storeDomain}/cart/${lines.map((l) => `${l.variantId.match(/ProductVariant\/(\d+)/)![1]}:${Math.min(l.quantity, 10)}`).join(',')}`;
    return { cartId: null, continueUrl: permalink, source: 'permalink' as const, messages: [{ type: 'warning', content: e instanceof Error ? e.message : String(e) }] };
  }
}
