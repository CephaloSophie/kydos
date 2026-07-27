import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Tests du composant table partagé (logique de layout, thèmes, responsive).
export default defineConfig({
  resolve: { alias: { 'belote-core': resolve(__dirname, '../core/src/index.ts') } },
  test: {
    include: ['**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', 'node_modules/**', 'dist/**', 'index.ts'],
      thresholds: { statements: 22, branches: 70, functions: 30, lines: 22 },
    },
  },
});
