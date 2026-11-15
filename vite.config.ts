import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { giftyApi } from './server/apiPlugin';

export default defineConfig({ plugins: [react(), giftyApi()] });
