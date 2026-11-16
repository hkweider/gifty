// Vercel function: POST /api/refine (needs ANTHROPIC_API_KEY)
import { refine, type RefineInput } from '../server/chat.js';
import { vercelHandler } from '../server/vercel.js';

export default vercelHandler((body) => refine(body as unknown as RefineInput));
