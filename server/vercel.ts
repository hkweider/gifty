import type { IncomingMessage, ServerResponse } from 'node:http';
import { UcpError } from './ucp.js';

type Req = IncomingMessage & { body?: unknown };

/** Wraps a UCP handler as a Vercel Node function (POST JSON in, JSON out). */
export function vercelHandler(fn: (body: Record<string, unknown>, buyerIp?: string) => Promise<unknown>) {
  return async (req: Req, res: ServerResponse) => {
    res.setHeader('content-type', 'application/json');
    if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Use POST' })); return; }
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
      const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      res.statusCode = 200;
      res.end(JSON.stringify(await fn(body as Record<string, unknown>, ip)));
    } catch (e) {
      res.statusCode = e instanceof UcpError ? e.status : 500;
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Unexpected error' }));
    }
  };
}
