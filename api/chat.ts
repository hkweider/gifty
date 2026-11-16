// Vercel function: POST /api/chat (needs ANTHROPIC_API_KEY in the project's environment variables)
import { chat, type ChatContext, type ChatTurn } from '../server/chat.js';
import { vercelHandler } from '../server/vercel.js';

export default vercelHandler((body) => chat(body as unknown as { messages: ChatTurn[]; context: ChatContext }));
