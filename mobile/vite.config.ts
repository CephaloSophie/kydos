import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Application MOBILE — build autonome (base relative pour Cordova file://).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      'belote-core': resolve(__dirname, '../packages/core/src/index.ts'),
      '@kydos/table-pixi': resolve(__dirname, '../packages/table-pixi/index.ts'),
    },
  },
  server: { port: 5180 },
  build: { outDir: 'dist', emptyOutDir: true },
});
