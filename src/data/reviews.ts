import type { Product } from './types';
import consumerReports from '../assets/sources/consumer-reports.png';
import trustpilot from '../assets/sources/trustpilot.png';
import reddit from '../assets/sources/reddit.png';
import tiktok from '../assets/sources/tiktok.png';

export interface ReviewSource {
  logo?: string;
  logoAlt: string;
  name?: string;
  kind: 'Independent test' | 'Verified buyers' | 'Social' | 'From the maker';
  score: string;
  text: string;
  retrieved: string;
}

export interface ReviewSummary {
  why: string;
  rating: number;
  ratings: string;
  distribution: [number, number, number, number, number]; // 5★..1★ percentages
  summary: string;
  agree: string;
  mixed: string;
  mix: { tests: number; buyers: number; social: number };
  durability: number; // 0..1
  ease: number;
  sources: ReviewSource[];
  likes: string[];
  watch: string[];
  buying: string;
  buyingMeta: string;
  gaps?: string;
  alsoFor?: string;
}

const kettle: ReviewSummary = {
  why: 'A pour-over kettle for a coffee lover who already owns a grinder. The stainless steel body and 2-year warranty suit his wish for something durable, and it is a one-time purchase with no subscription. At CA$ 89.00 it fits within his CA$ 150 Christmas budget.',
  rating: 4.5,
  ratings: '12,480 ratings across 1,000+ sources',
  distribution: [72, 18, 6, 2, 2],
  summary: 'Reviewers consistently praise the sturdy steel build and the steady, controllable pour. Social posts are more critical of the warm handle and snug lid than the independent test or verified buyers.',
  agree: 'Durable build · precise pour · easy to clean',
  mixed: 'Handle heat · lid fit',
  mix: { tests: 20, buyers: 45, social: 35 },
  durability: 0.86,
  ease: 0.74,
  sources: [
    { logo: consumerReports, logoAlt: 'Consumer Reports', kind: 'Independent test', score: '8.6 / 10', text: 'Tested pour control and heat retention. The steel body held up in durability testing. Lost a point for slow heat-up.', retrieved: 'Retrieved Nov 15' },
    { logo: trustpilot, logoAlt: 'Trustpilot', kind: 'Verified buyers', score: '4.6 ★ · 1,102', text: 'Most buyers say it still looks new after a year of daily use. Several mention the handle getting warm.', retrieved: 'Retrieved Nov 15' },
    { logo: reddit, logoAlt: 'Reddit', name: 'r/pourover', kind: 'Social', score: 'Mixed', text: 'Enthusiasts like the spout but say the handle gets hot and the lid sticks. A few recommend it as a first gooseneck.', retrieved: 'Retrieved Nov 15' },
    { logo: tiktok, logoAlt: 'TikTok', name: 'hands-on video', kind: 'Social', score: 'Positive', text: 'Reviewer calls the pour steady and the build solid, and flags the lid as snug.', retrieved: 'Retrieved Nov 15' },
    { logoAlt: '', name: 'Aurora Coffee Co.', kind: 'From the maker', score: '—', text: 'Product page lists 1.0 L capacity, stainless steel body and a 2-year warranty. No independent claims.', retrieved: 'Retrieved Nov 15' },
  ],
  likes: ['Steady, controllable pour', 'Steel body still looks new after a year', 'Heats quickly and shuts off automatically'],
  watch: ['Handle gets warm on long pours', 'Lid fits snugly and can stick', 'Slow to heat from cold'],
  buying: 'CA$ 89.00 comes to CA$ 100.57 with tax, and shipping to Toronto is free. Returns are accepted for 30 days and the maker covers the kettle for 2 years.',
  buyingMeta: 'Arrives Dec 17–19 · 30-day returns · 2-year warranty',
  gaps: 'Reviews from two smaller retailers were unavailable at the time of the check.',
};

/** Review summary for a product. Sample data has a full set for the kettle; others get a lighter summary. */
export function reviewsFor(p: Product, personName: string): ReviewSummary {
  if (p.id === 'kettle') return kettle;
  const r = p.customer?.rating ?? 4.4;
  return {
    why: `${p.blurb}. A practical pick that fits ${personName}'s profile and stays inside the budget for this list.`,
    rating: r,
    ratings: `${p.customer?.count ?? 'Few'} ratings across ${p.expert?.sources ?? 1} sources`,
    distribution: [64, 22, 8, 3, 3],
    summary: `Buyers like the quality for the price. Expert reviewers rate it ${p.expert?.score ?? '—'} on average.`,
    agree: 'Good value · well made', mixed: 'Packaging',
    mix: { tests: 15, buyers: 60, social: 25 },
    durability: 0.7, ease: 0.8,
    sources: [
      { logo: trustpilot, logoAlt: 'Trustpilot', kind: 'Verified buyers', score: `${r} ★ · ${p.customer?.count ?? '—'}`, text: 'Most buyers are happy with it and would buy again.', retrieved: 'Retrieved Nov 15' },
      { logoAlt: '', name: p.maker ?? p.store, kind: 'From the maker', score: '—', text: `Product page: ${p.blurb.toLowerCase()}.`, retrieved: 'Retrieved Nov 15' },
    ],
    likes: ['Well made for the price', 'Arrives gift-ready'],
    watch: ['Limited colour options'],
    buying: `${'CA$ ' + p.price.toFixed(2)} before tax. Returns are accepted for 30 days at ${p.store}.`,
    buyingMeta: `Arrives ${p.arrives} · 30-day returns`,
  };
}

/** Compare rows (07). Keyed by product id; falls back to generic text. */
export const compareRows: Record<string, Record<string, string>> = {
  kettle: { why: 'Durable steel and a gooseneck pour for a coffee lover', durability: 'Built to last: steel body, 2-year warranty', reviews: '4.5 from 1.2k buyers and 12 sources', procon: 'Pro: steady pour. Con: handle gets warm', price: 'CA$ 100.57 with tax, free shipping', store: 'Hartwell Home · 30-day returns · Dec 17–19' },
  dripper: { why: 'A simple ceramic pour-over for his single cups', durability: 'Sturdy, though ceramic can chip', reviews: '4.6 from 842 buyers and 9 sources', procon: 'Pro: easy to clean. Con: can chip', price: 'CA$ 48.41 with tax and shipping', store: 'Hartwell Home · 30-day returns · Dec 17–19' },
  tea: { why: 'A treat to share, but not a brewing upgrade', durability: 'Consumable, nothing to wear out', reviews: '4.7 from 318 buyers and 5 sources', procon: 'Pro: crowd-pleaser. Con: not durable', price: 'CA$ 79.80 with tax and shipping', store: 'Northfield Goods · 14-day returns · Dec 20–23' },
};
