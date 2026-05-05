import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      protocol: 'wss',
      clientPort: 8443,
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: '@api',
        replacement: `${__dirname}/client-api/index.ts`,
      },
      {
        find: /^@\//,
        replacement: `${__dirname}/`,
      },
    ],
  },
  // Load .env from project root unless building on Vercel
  envDir: process.env.VERCEL ? '.' : '..',
});
