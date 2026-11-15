/**
 * SAMPLE review data for live catalog products.
 * Consumer Reports, Trustpilot, Reddit and TikTok are not connected yet (they need partner/API
 * access), so this generates stable, plausible review summaries per product. Everything here is
 * flagged `sample: true` and labelled in the UI. Replace `sampleReviews` with real source
 * lookups when those integrations exist.
 */
import type { Product } from './types';
import type { ReviewSummary } from './reviews';
import consumerReports from '../assets/sources/consumer-reports.png';
import trustpilot from '../assets/sources/trustpilot.png';
import reddit from '../assets/sources/reddit.png';
import tiktok from '../assets/sources/tiktok.png';

/** Deterministic pseudo-random numbers from a product id, so a product always shows the same sample. */
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)];
const round1 = (n: number) => Math.round(n * 10) / 10;

const LIKES = [
  'Feels well made for the price', 'Arrives nicely packaged and gift-ready', 'Looks better in person than in photos',
  'Easy to use straight out of the box', 'Holds up well after months of use', 'Thoughtful details people notice',
];
const WATCH = [
  'Runs smaller than some expect', 'Colour can differ slightly from photos', 'Shipping can take a few extra days',
  'Packaging is basic', 'A few reports of minor wear', 'Instructions are thin',
];
const SUBREDDITS = ['r/BuyItForLife', 'r/gifts', 'r/GiftIdeas', 'r/HomeImprovement', 'r/Cooking', 'r/hiking'];

export function sampleReviews(p: Product, personName: string): ReviewSummary & { sample: true; expertScore: number; expertSources: number } {
  const r = rng(p.id);
  const rating = p.customer?.rating ?? round1(3.9 + r() * 1.0);
  const count = p.customer?.count ?? String(40 + Math.floor(r() * 900));
  const expertScore = round1(6.8 + r() * 2.4);
  const expertSources = 2 + Math.floor(r() * 9);
  const tp = round1(Math.min(5, rating + (r() - 0.5) * 0.4));
  const tpCount = (120 + Math.floor(r() * 2400)).toLocaleString('en-CA');
  const five = Math.round(48 + (rating - 3.8) * 30 + r() * 8);
  const four = Math.round(Math.max(8, 30 - (rating - 4) * 12));
  const three = Math.round(Math.max(2, (100 - five - four) * 0.5));
  const two = Math.round(Math.max(1, (100 - five - four - three) * 0.5));
  const one = Math.max(0, 100 - five - four - three - two);
  const social = pick(r, ['Positive', 'Mixed', 'Positive', 'Mostly positive']);
  const likes = [...LIKES].sort(() => r() - 0.5).slice(0, 3);
  const watch = [...WATCH].sort(() => r() - 0.5).slice(0, 2);
  const tests = 10 + Math.floor(r() * 20);
  const buyers = 35 + Math.floor(r() * 25);
  return {
    sample: true,
    expertScore,
    expertSources,
    why: '',
    rating: round1(rating),
    ratings: `${count} ratings across ${expertSources + 3} sources`,
    distribution: [five, four, three, two, one],
    summary: `What reviewers mention most about ${p.name}: ${likes[0].toLowerCase()}. ${social === 'Mixed' ? 'Social posts are more divided than buyer reviews,' : 'Social posts are broadly positive,'} and the most common complaint is that it ${watch[0].charAt(0).toLowerCase()}${watch[0].slice(1)}.`,
    agree: likes.slice(0, 2).map((l) => l.toLowerCase()).join(' · '),
    mixed: watch[0].toLowerCase(),
    mix: { tests, buyers, social: 100 - tests - buyers },
    durability: round1(0.55 + r() * 0.4),
    ease: round1(0.6 + r() * 0.35),
    sources: [
      { logo: consumerReports, logoAlt: 'Consumer Reports', kind: 'Independent test', score: `${expertScore} / 10`, text: `Rated on build quality, everyday usability and value. ${expertScore >= 8 ? 'Scored well overall' : 'Solid but not class-leading'}; lost points because it ${watch[0].charAt(0).toLowerCase()}${watch[0].slice(1)}.`, retrieved: 'Sample' },
      { logo: trustpilot, logoAlt: 'Trustpilot', kind: 'Verified buyers', score: `${tp} ★ · ${tpCount}`, text: `Buyers of ${p.store} say the order ${likes[1].toLowerCase()}. ${watch[1]}.`, retrieved: 'Sample' },
      { logo: reddit, logoAlt: 'Reddit', name: pick(r, SUBREDDITS), kind: 'Social', score: social, text: `Threads recommend it as a gift for someone like ${personName}, with a few people noting it ${watch[0].charAt(0).toLowerCase()}${watch[0].slice(1)}.`, retrieved: 'Sample' },
      { logo: tiktok, logoAlt: 'TikTok', name: 'unboxing video', kind: 'Social', score: pick(r, ['Positive', 'Positive', 'Mixed']), text: `Creator unboxes it and calls out that it ${likes[2].toLowerCase()}.`, retrieved: 'Sample' },
    ],
    likes,
    watch,
    buying: '',
    buyingMeta: '',
  };
}
