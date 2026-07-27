import { defineConfig } from 'vitest/config';

/** Tests unitaires PURS du moteur (aucune dépendance externe, aucun réseau). */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: { statements: 80, branches: 80, functions: 75, lines: 80 },
    },
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
