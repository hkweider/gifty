import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import { createCart, getProduct, getProductDetail, searchCatalog, UcpError } from './ucp';

/**
 * Mounts the Gifty API under /api on the Vite dev and preview servers:
 *   POST /api/catalog/search   { query, maxPrice?, intent?, limit?, cursor? }
 *   GET  /api/catalog/product?id=gid://shopify/p/…
 *   POST /api/catalog/variant  { id, selected?: [{ name, label }] }
 *   POST /api/carts            { storeDomain, lines: [{ variantId, quantity }] }
 * The handlers in ./ucp are framework-agnostic; reuse them in your production server.
 */
export function giftyApi(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    route(req, res).catch((e: unknown) => {
      const status = e instanceof UcpError ? e.status : 500;
      send(res, status, { error: e instanceof Error ? e.message : 'Unexpected error' });
    });
  };
  return {
    name: 'gifty-api',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/api/catalog/search') {
    return send(res, 200, await searchCatalog(await json(req)));
  }
  if (req.method === 'GET' && url.pathname === '/api/catalog/product') {
    const id = url.searchParams.get('id');
    if (!id) throw new UcpError('id is required', 400);
    return send(res, 200, await getProduct(id));
  }
  if (req.method === 'POST' && url.pathname === '/api/catalog/variant') {
    const body = await json(req);
    if (typeof body.id !== 'string') throw new UcpError('id is required', 400);
    const selected = Array.isArray(body.selected) ? body.selected.filter((s: { name?: unknown; label?: unknown }) => typeof s?.name === 'string' && typeof s?.label === 'string').slice(0, 5) : [];
    return send(res, 200, await getProductDetail(body.id, selected));
  }
  if (req.method === 'POST' && url.pathname === '/api/carts') {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.socket.remoteAddress;
    return send(res, 200, await createCart(await json(req), ip));
  }
  send(res, 404, { error: 'Not found' });
}

async function json(req: IncomingMessage) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new UcpError('Request too large', 413);
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw new UcpError('Invalid JSON', 400); }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}
