import { useEffect, useState } from 'react';
import type { Product } from '../data/types';
import { searchLive, type LiveQuery } from './api';

type State = { status: 'loading' | 'error'; products: Product[]; error?: string } | { status: 'ready'; products: Product[] };

const cache = new Map<string, Product[]>();
const keyOf = (q: LiveQuery) => JSON.stringify([q.query, q.maxPrice, q.type]);

/** Live catalog results for a query, cached per session. `retry` re-fetches after an error. */
export function useCatalog(q: LiveQuery | null) {
  const key = q ? keyOf(q) : '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>(() => (q && cache.has(key) ? { status: 'ready', products: cache.get(key)! } : { status: 'loading', products: [] }));

  useEffect(() => {
    if (!q) return;
    if (cache.has(key)) { setState({ status: 'ready', products: cache.get(key)! }); return; }
    let live = true;
    setState({ status: 'loading', products: [] });
    // Retry twice with backoff before showing the failure state (anonymous Shopify traffic is rate limited).
    const run = (n: number): Promise<Product[]> => searchLive(q).catch((e: unknown) => {
      if (n >= 2 || !live) throw e;
      return new Promise((r) => setTimeout(r, 1500 * 2 ** n + Math.random() * 500)).then(() => run(n + 1));
    });
    run(0)
      .then((products) => { cache.set(key, products); if (live) setState({ status: 'ready', products }); })
      .catch((e: unknown) => live && setState({ status: 'error', products: [], error: e instanceof Error ? e.message : String(e) }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return { ...state, retry: () => { cache.delete(key); setAttempt((a) => a + 1); } };
}
