// Vercel function: POST /api/carts
import { createCart } from '../server/ucp.js';
import { vercelHandler } from '../server/vercel.js';

export default vercelHandler((body, ip) => createCart(body as unknown as Parameters<typeof createCart>[0], ip));
