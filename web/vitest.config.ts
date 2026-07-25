import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

/** Tests unitaires du front. Chaque test est INDÉPENDANT (socket/API mockés, pas de réseau). */
export default defineConfig({
  resolve: {
    alias: {
      '@kydos/table-pixi': resolve(__dirname, '../packages/table-pixi/index.ts'),
      'belote-core': fileURLToPath(new URL('../packages/core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
  },
});
