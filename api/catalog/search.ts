// Vercel function: POST /api/catalog/search
import { searchCatalog, type SearchInput } from '../../server/ucp.js';
import { vercelHandler } from '../../server/vercel.js';

export default vercelHandler((body) => searchCatalog(body as unknown as SearchInput));
