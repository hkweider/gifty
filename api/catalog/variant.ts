// Vercel function: POST /api/catalog/variant
import { getProductDetail, UcpError } from '../../server/ucp.js';
import { vercelHandler } from '../../server/vercel.js';

export default vercelHandler(async (body) => {
  if (typeof body.id !== 'string') throw new UcpError('id is required', 400);
  const selected = Array.isArray(body.selected)
    ? (body.selected as { name?: unknown; label?: unknown }[]).filter((s) => typeof s?.name === 'string' && typeof s?.label === 'string').slice(0, 5) as { name: string; label: string }[]
    : [];
  return getProductDetail(body.id, selected);
});
