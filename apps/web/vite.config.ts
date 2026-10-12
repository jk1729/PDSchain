import * as path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../..'),
  server: {
    host: process.env.WEB_HOST ?? '127.0.0.1',
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
  },
  preview: {
    host: process.env.WEB_HOST ?? '127.0.0.1',
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
  },
});
