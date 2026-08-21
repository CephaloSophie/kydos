import { defineConfig } from 'vitest/config';

/**
 * Back-office server test configuration.
 * -----------------------------------------------------------------------------
 * Tous les tests actuels sont PURS (aucune connexion Mongo, aucun serveur
 * Express) : ils exercent les helpers du module `tournamentDetail.ts`.
 * Le seuil de couverture cible ≥ 80 % sur ce module.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/tournamentDetail.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
