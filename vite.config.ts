import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { giftyApi } from './server/apiPlugin';

export default defineConfig(({ mode }) => {
  // Make server-only secrets from .env (ANTHROPIC_API_KEY, SHOPIFY_UCP_TOKEN) available to the
  // /api routes. Only VITE_* variables are ever exposed to the browser bundle.
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['ANTHROPIC_API_KEY', 'SHOPIFY_UCP_TOKEN', 'UCP_AGENT_PROFILE']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k];
  }
  return { plugins: [react(), giftyApi()] };
});
