import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kydos/table-pixi': resolve(__dirname, '../packages/table-pixi/index.ts'),
      'belote-core': fileURLToPath(new URL('../packages/core/src/index.ts', import.meta.url)),
    },
  },
  server: { port: 5173 },
});
