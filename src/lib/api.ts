/**
 * Thin API layer. Today it serves sample data; swap these functions for calls to the
 * product-data source and Shopify UCP. Screens only talk to this module and the store.
 */
import { products, productTypes, typeCounts } from '../data/sample';
import type { Product, ProductTypeId, Tint } from '../data/types';

/** Live Shopify data unless the build sets VITE_DATA=sample (e.g. the static preview). */
export const LIVE = import.meta.env.VITE_DATA !== 'sample';
/** Account currency. Live results in other currencies are dropped so cart totals stay correct. */
export const CURRENCY = 'CAD';

export type FindState = 'ready' | 'loading' | 'empty' | 'limited' | 'demo';

export interface Filters {
  maxBudget: number;
  noSubscription: boolean;
  durable: boolean;
}

/** Products seen from the live catalog this session, so lists and the cart can resolve them. */
const registry = new Map<string, Product>();

/** Restore live products saved with the lists and cart. */
export const rememberProducts = (list: Product[]) => list.forEach((p) => registry.set(p.id, p));

export const getProduct = (id: string): Product => {
  const p = registry.get(id) ?? products.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown product ${id}`);
  return p;
};

export const getType = (id: ProductTypeId) => productTypes.find((t) => t.id === id)!;

export function productsByType(type: ProductTypeId, filters?: Filters): Product[] {
  return products
    .filter((p) => p.type === type && p.id !== 'deskmat')
    .filter((p) => !filters || p.price <= filters.maxBudget);
}

/** Results for a free-text query. Sample: any coffee-ish query returns the full coffee catalogue. */
export function searchProducts(_q: string, filters?: Filters): Product[] {
  return products.filter((p) => p.id !== 'deskmat').filter((p) => !filters || p.price <= filters.maxBudget);
}

export function ideaCount(type: ProductTypeId) {
  return typeCounts[type] ?? 0;
}

/** Products with no expert reviews found (shown as "Limited reviews"). */
export const LIMITED_REVIEWS = new Set(['cleaning', 'snacks']);

/** Price breakdown for one cart line, from the store catalogue and store checkout. */
export function priceBreakdown(p: Product, codeShare: number) {
  return {
    list: p.listPrice ?? p.price,
    sale: (p.listPrice ?? p.price) - p.price,
    catalog: p.price,
    code: codeShare,
    afterCode: p.price - codeShare,
  };
}

/* ---------- Live Shopify catalog (via the /api server routes) ---------- */

interface LiveProductDto {
  id: string; variantId: string; name: string; store: string; storeDomain: string;
  price: number; listPrice?: number; currency: string; blurb: string; description: string;
  image?: string; images: string[]; url?: string; refundPolicyUrl?: string;
  rating?: { value: number; count: number };
  variants: { id: string; title: string; available: boolean; price: number }[]; features: string[];
}

const TINTS: Tint[] = ['peach', 'butter', 'blush', 'sky', 'sage'];
const tintFor = (id: string) => TINTS[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));

function toProduct(d: LiveProductDto, type: ProductTypeId): Product {
  const existing = registry.get(d.id);
  const p: Product = {
    id: d.id, name: d.name, store: d.store, price: d.price, listPrice: d.listPrice, currency: d.currency,
    blurb: d.blurb, type: existing?.type ?? type, tint: tintFor(d.id),
    customer: d.rating ? { rating: d.rating.value, count: compact(d.rating.count) } : undefined,
    sampleReviews: true,
    arrives: 'Confirmed at checkout',
    variants: d.variants.length > 1 ? d.variants.filter((v) => v.available).map((v) => v.title).slice(0, 4) : undefined,
    image: d.image,
    live: {
      variantId: d.variantId, storeDomain: d.storeDomain, description: d.description, images: d.images,
      url: d.url, refundPolicyUrl: d.refundPolicyUrl, features: d.features, variants: d.variants,
    },
  };
  registry.set(p.id, p);
  return p;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface LiveQuery { query: string; maxPrice?: number; intent?: string; type: ProductTypeId; limit?: number }

/** Search Shopify's Global Catalog. Throws when live results are unavailable (shows the 05d state). */
/** At most 2 catalog searches in flight from this page; the rest wait their turn. */
let inFlight = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= 2) await new Promise<void>((r) => waiting.push(r));
  inFlight++;
  try { return await fn(); } finally { inFlight--; waiting.shift()?.(); }
}

export async function searchLive(q: LiveQuery): Promise<Product[]> {
  const res = await limited(() => post<{ products: LiveProductDto[] }>('/api/catalog/search', {
    query: q.query, maxPrice: Number.isFinite(q.maxPrice) ? q.maxPrice : undefined, intent: q.intent,
    limit: q.limit ?? 24, currency: CURRENCY,
  }));
  return res.products.filter((d) => d.currency === CURRENCY).map((d) => toProduct(d, q.type));
}

/** Create a cart at one merchant and return the URL of that store's checkout. */
export async function createStoreCart(storeDomain: string, lines: { variantId: string; quantity: number }[]) {
  return post<{ continueUrl: string; source: 'cart_mcp' | 'permalink'; total?: number }>('/api/carts', { storeDomain, lines });
}
