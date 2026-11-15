// Sample data matching the Direction B boards. Replace with the real API layer (see src/lib/api.ts).
import type {
  CartItem, Occasion, Person, Product, ProductType, Purchase, SavedItem, ShortlistItem, Store,
} from './types';
import kettleImg from '../assets/products/aurora-kettle.jpg';

export const USER = { name: 'Hannah', initial: 'H' };

/** "Today" for sample data. Boards are dated Nov 15, 2026. */
export const TODAY = new Date('2026-11-15T14:00:00');

export const people: Person[] = [
  {
    id: 'dad', name: 'Dad', initial: 'D', relationship: 'Parent', pronoun: 'he',
    summary: 'Coffee lover · owns a grinder · wants durable, no subscription',
    interests: ['Coffee', 'Hiking', 'Cooking'],
    avoids: ['Subscriptions', 'Scented items'],
    owns: ['Burr grinder', 'French press', 'Insulated mug'],
    sizes: { shirt: 'L', shoe: '10', phone: 'Pixel 8' },
    style: 'Practical', usualSpend: '$60 – $150', stores: ['Hartwell Home', 'Northfield Goods'],
    history: [
      { id: 'h1', name: 'Leather Trail Wallet', occasion: "Father's Day 2025", store: 'Northfield Goods', price: 45, note: 'Uses it every day', reaction: 'Loved', tint: 'sage' },
      { id: 'h2', name: 'Insulated Trail Flask', occasion: 'Christmas 2024', store: 'Hartwell Home', price: 120, note: 'Still his favourite', reaction: 'Loved', tint: 'peach' },
      { id: 'h3', name: 'Beard Care Set', occasion: 'Birthday 2024', store: 'Birch & Co.', price: 60, note: 'Wanted a different colour', reaction: 'Liked', tint: 'butter' },
      { id: 'h4', name: 'Compact Bluetooth Speaker', occasion: 'Christmas 2023', store: 'Hartwell Home', price: 35, note: 'Already had one', reaction: 'Meh', tint: 'sky' },
    ],
  },
  {
    id: 'mom', name: 'Mom', initial: 'M', relationship: 'Parent', pronoun: 'she',
    summary: 'Gardener and baker · nothing needing assembly',
    interests: ['Gardening', 'Baking'],
    avoids: ['Nothing needing assembly'],
    owns: [], sizes: {}, style: 'Sentimental', usualSpend: '$40 – $80', stores: ['Northfield Goods'],
    history: [
      { id: 'h5', name: 'Insulated Trail Flask', occasion: 'Birthday 2025', store: 'Hartwell Home', price: 40, note: '', reaction: 'Liked', tint: 'sage' },
      { id: 'h6', name: 'Herb Planter Trio', occasion: 'Christmas 2024', store: 'Birch & Co.', price: 38, note: '', reaction: 'Loved', tint: 'blush' },
    ],
  },
  {
    id: 'sam', name: 'Sam', initial: 'S', relationship: 'Sibling', pronoun: 'they',
    summary: 'Gaming and cycling',
    interests: ['Gaming', 'Cycling'], avoids: [], owns: [], sizes: {},
    style: 'Practical', usualSpend: '$20 – $50', stores: [], history: [],
  },
];

export const occasions: Occasion[] = [
  {
    id: 'christmas-2026', name: 'Christmas 2026', shortName: 'Christmas', date: '2026-12-25', budget: 270,
    people: [{ personId: 'dad', budget: 150 }, { personId: 'mom', budget: 80 }, { personId: 'sam', budget: 40 }],
  },
  { id: 'moms-birthday', name: "Mom's birthday", shortName: 'birthday', date: '2027-01-12', budget: 60, people: [{ personId: 'mom', budget: 60 }] },
  { id: 'dads-birthday', name: "Dad's birthday", shortName: 'birthday', date: '2027-03-03', budget: 100, people: [{ personId: 'dad', budget: 100 }] },
  { id: 'fathers-day', name: "Father's Day", shortName: "Father's Day", date: '2027-06-18', budget: 0, people: [{ personId: 'dad', budget: 0 }], reminderOnly: true },
];

export const productTypes: ProductType[] = [
  { id: 'brewing', name: 'Brewing gear', tint: 'sky', narrow: ['Pour-over', 'Espresso', 'Cold brew'] },
  { id: 'giftsets', name: 'Gift sets', tint: 'blush', narrow: ['Tea', 'Chocolate', 'Snacks'] },
  { id: 'accessories', name: 'Accessories', tint: 'sage', narrow: ['Cleaning', 'Scoops', 'Mugs'] },
  { id: 'beans', name: 'Beans & tea', tint: 'peach', narrow: [] },
  { id: 'books', name: 'Books', tint: 'butter', narrow: [] },
  { id: 'experiences', name: 'Experiences', tint: 'sky', narrow: [] },
];

/** Idea counts per type for Dad (catalogue sizes, not all loaded in sample). */
export const typeCounts: Record<string, number> = {
  brewing: 8, giftsets: 6, accessories: 5, beans: 4, books: 4, experiences: 3,
};

export const products: Product[] = [
  { id: 'kettle', name: 'Aurora Gooseneck Kettle', store: 'Hartwell Home', maker: 'Aurora Coffee Co.', price: 89, listPrice: 109, blurb: 'Gooseneck spout, 1.0 L, stainless steel', type: 'brewing', tint: 'butter', expert: { score: 8.6, sources: 12 }, customer: { rating: 4.5, count: '1.2k' }, arrives: 'Dec 17–19', variants: ['Matte white', 'Matte black'], image: kettleImg },
  { id: 'dripper', name: 'Ceramic Pour-over Dripper', store: 'Hartwell Home', price: 34, blurb: 'Fits most mugs and carafes, dishwasher safe', type: 'brewing', tint: 'sky', expert: { score: 8.1, sources: 9 }, customer: { rating: 4.6, count: '842' }, arrives: 'Dec 17–19' },
  { id: 'scale', name: 'Pour-over Scale with Timer', store: 'Northfield Goods', price: 52, blurb: '0.1 g precision, auto-off, rechargeable', type: 'brewing', tint: 'blush', expert: { score: 8.3, sources: 7 }, customer: { rating: 4.4, count: '610' }, arrives: 'Dec 20–23' },
  { id: 'tea', name: 'Botanical Tea & Honey Set', store: 'Northfield Goods', price: 60, blurb: 'Six loose-leaf teas and a small-batch honey', type: 'giftsets', tint: 'sage', expert: { score: 7.9, sources: 5 }, customer: { rating: 4.7, count: '318' }, arrives: 'Dec 20–23' },
  { id: 'chocolate', name: 'Tasting Chocolate Box', store: 'Birch & Co.', price: 38, blurb: 'Twelve single-origin bars in a gift box', type: 'giftsets', tint: 'peach', expert: { score: 8.2, sources: 6 }, customer: { rating: 4.6, count: '1.4k' }, arrives: 'Dec 18–21' },
  { id: 'snacks', name: 'Trail Snack Crate', store: 'Birch & Co.', price: 44, blurb: 'Snacks from five small producers', type: 'giftsets', tint: 'butter', expert: { score: 7.7, sources: 4 }, customer: { rating: 4.5, count: '227' }, arrives: 'Dec 18–21' },
  { id: 'cleaning', name: 'Burr Grinder Cleaning Kit', store: 'Northfield Goods', price: 18, blurb: 'Brush, tablets and a puffer for grinders', type: 'accessories', tint: 'sky', expert: { score: 8.0, sources: 5 }, customer: { rating: 4.4, count: '503' }, arrives: 'Dec 20–23' },
  { id: 'scoop', name: 'Walnut Coffee Scoop', store: 'Hartwell Home', price: 22, blurb: 'Hand-turned walnut with a 10 g bowl', type: 'accessories', tint: 'blush', expert: { score: 7.8, sources: 3 }, customer: { rating: 4.7, count: '190' }, arrives: 'Dec 17–19' },
  { id: 'deskmat', name: 'Wide Desk Mat', store: 'Hartwell Home', price: 45, blurb: 'Felt and cork, 90 × 40 cm', type: 'accessories', tint: 'butter', expert: { score: 7.6, sources: 4 }, customer: { rating: 4.5, count: '388' }, arrives: 'Dec 17–19' },
];

export const stores: Record<string, Store> = {
  'Hartwell Home': { name: 'Hartwell Home', shippingNote: 'Arrives Dec 17–19 (standard)', orderBy: 'Order by Dec 12 to arrive by Dec 24', arrives: 'Dec 17–19' },
  'Northfield Goods': { name: 'Northfield Goods', shippingNote: 'Arrives Dec 20–23 (standard)', orderBy: 'Order by Dec 18 to arrive by Dec 24 · Birthday is Jan 12, so no rush', arrives: 'Dec 20–23' },
};

/** Store-side quote: codes and shipping/tax come from each store's checkout (Shopify UCP). */
export const storeQuotes: Record<string, { code?: string; codeSavings: number; shippingTax: number; freeShippingAway?: number }> = {
  'Hartwell Home': { code: 'WELCOME10', codeSavings: 13.4, shippingTax: 26.97, freeShippingAway: 29.4 },
  'Northfield Goods': { codeSavings: 0, shippingTax: 17.41 },
};

export const initialShortlist: ShortlistItem[] = [
  { productId: 'kettle', personId: 'dad', occasionId: 'christmas-2026', status: 'Selected', variant: 'Matte white', addedAt: 4 },
  { productId: 'dripper', personId: 'dad', occasionId: 'christmas-2026', status: 'Considering', addedAt: 3 },
  { productId: 'tea', personId: 'dad', occasionId: 'christmas-2026', status: 'Considering', addedAt: 2 },
  { productId: 'cleaning', personId: 'dad', occasionId: 'christmas-2026', status: 'Considering', addedAt: 1 },
  { productId: 'deskmat', personId: 'sam', occasionId: 'christmas-2026', status: 'Selected', addedAt: 0 },
  { productId: 'tea', personId: 'mom', occasionId: 'moms-birthday', status: 'Selected', addedAt: 0 },
];

export const initialCart: CartItem[] = [
  { id: 'c1', productId: 'kettle', personId: 'dad', occasionId: 'christmas-2026', qty: 1, why: 'Store sale; price dropped CA$ 6 since you added it' },
  { id: 'c2', productId: 'deskmat', personId: 'sam', occasionId: 'christmas-2026', qty: 1 },
  { id: 'c3', productId: 'tea', personId: 'mom', occasionId: 'moms-birthday', qty: 1 },
];

export const initialSaved: SavedItem[] = [
  { id: 's1', productId: 'dripper', personId: 'dad', occasionId: 'christmas-2026', savedAgo: 'Saved 3 days ago' },
];

export const purchases: Purchase[] = [
  {
    id: 'p1', item: 'Merino Hiking Socks', personId: 'dad', occasionLabel: 'Christmas', occasionId: 'christmas-2026', store: 'Hartwell Home', date: 'Nov 12', price: 38, status: 'Shipped', arrives: 'Dec 3–6', tint: 'butter',
    details: {
      shipTo: '142 Maple Ave · Toronto, ON', carrier: 'Canada Post · Tracking: 7300 1182 9054', lastUpdate: 'Last update: today, 9:12 AM · from store link',
      order: 'Order # HH-48213 · Paid on Hartwell Home', returns: 'Return by: Jan 15 · 30-day returns, free label', gift: 'Gift note / wrapped: ☐ wrapped',
    },
  },
  { id: 'p2', item: 'Controller Charging Dock', personId: 'sam', occasionLabel: 'Christmas', occasionId: 'christmas-2026', store: 'Hartwell Home', date: 'Nov 12', price: 20, status: 'Shipped', arrives: 'Dec 3–6', tint: 'sky' },
  { id: 'p3', item: 'Hand-painted Planter', personId: 'mom', occasionLabel: 'Christmas', occasionId: 'christmas-2026', store: 'Birch & Co.', date: 'Nov 10', price: 34, status: 'Processing', arrives: 'Dec 10–14', tint: 'blush' },
  { id: 'p4', item: 'Leather Trail Wallet', personId: 'dad', occasionLabel: "Father's Day 2025", store: 'Northfield Goods', date: 'Jun 8', price: 45, status: 'Delivered', arrives: 'Jun 14', tint: 'sage' },
];

/** Search suggestions shown under the Find gifts search box. */
export const searchSuggestions = {
  types: [
    { label: 'Pour-over coffee sets', sub: 'Brewing gear · 8 ideas', type: 'brewing' as const, tint: 'butter' as const },
    { label: 'Pour-over kettles', sub: 'Accessories · 5 ideas', type: 'accessories' as const, tint: 'sky' as const },
  ],
  products: ['scale', 'dripper', 'kettle'],
};

export const giftGuides = [
  { id: 'g1', title: 'Christmas gifts for the coffee lover', body: '12 ideas from expert reviews and buyer ratings. Updated this week.', tiles: ['image', 'peach', 'sage'] as const },
  { id: 'g2', title: 'Under CA$ 50 for him', body: '18 practical picks from independent makers, all under CA$ 50.', tiles: ['sage', 'sky', 'butter'] as const },
  { id: 'g3', title: 'Thoughtful gifts for parents', body: '14 ideas that work for any occasion, from tea sets to planters.', tiles: ['peach', 'blush', 'sky'] as const },
  { id: 'g4', title: 'Last-minute ideas', body: '10 gifts that arrive by Dec 24 with standard shipping.', tiles: ['butter', 'sage', 'peach'] as const },
];
