/**
 * Thin API layer. Today it serves sample data; swap these functions for calls to the
 * product-data source and Shopify UCP. Screens only talk to this module and the store.
 */
import { products, productTypes, typeCounts } from '../data/sample';
import type { Product, ProductTypeId } from '../data/types';

export type FindState = 'ready' | 'loading' | 'empty' | 'limited' | 'demo';

export interface Filters {
  maxBudget: number;
  noSubscription: boolean;
  durable: boolean;
}

export const getProduct = (id: string): Product => {
  const p = products.find((x) => x.id === id);
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
