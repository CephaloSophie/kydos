import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Tests mobiles : logique pure en `node`, écrans en DOM réel (happy-dom).
export default defineConfig({
  resolve: {
    alias: {
      'belote-core': resolve(__dirname, '../packages/core/src/index.ts'),
      '@kydos/table-pixi': resolve(__dirname, '../packages/table-pixi/index.ts'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/test/**', 'src/**/index.ts'],
      thresholds: { statements: 70, branches: 72, functions: 50, lines: 70 },
    },
    environment: 'node',
    environmentMatchGlobs: [['src/test/**', 'happy-dom'], ['src/presentation/**', 'happy-dom']],
    include: ['src/**/*.test.ts'],
  },
});
