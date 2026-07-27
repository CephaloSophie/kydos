import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Build LIBRAIRIE du module table autonome (@kanto-aplo/belote-table).
 *   npm --workspace belote-web run build:lib
 * Émet un bundle ESM + CSS dans web/dist-lib/. React/ReactDOM restent externes
 * (peerDependencies) ; belote-core et le design system sont inclus dans le bundle.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kydos/table-pixi': resolve(__dirname, '../packages/table-pixi/index.ts'),
      'belote-core': fileURLToPath(new URL('../packages/core/src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../packages/belote-table/dist', import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/table/lib-entry.ts', import.meta.url)),
      name: 'BeloteTable',
      formats: ['es'],
      fileName: () => 'belote-table.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: { assetFileNames: 'belote-table.[ext]' },
    },
  },
});
