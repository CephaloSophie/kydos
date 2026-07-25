import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Tests du composant table partagé (logique de layout, thèmes, responsive).
export default defineConfig({
  resolve: { alias: { 'belote-core': resolve(__dirname, '../core/src/index.ts') } },
  test: { include: ['**/*.test.ts'], environment: 'node' },
});
