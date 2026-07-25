import { defineConfig } from 'vitest/config';

/**
 * Server test configuration.
 *
 *  - Default `test` script runs PURE unit tests (fast, no external services).
 *  - Integration tests (Mongo-backed) live in `*.service.test.ts` files and are
 *    executed only when MONGOMS_AVAILABLE=1 (CI, dev machine with mongodb
 *    download reachable). Sandbox environments without network egress to
 *    fastdl.mongodb.org would 404 during binary download.
 */
export default defineConfig({
  test: {
    include: process.env.MONGOMS_AVAILABLE === '1'
      ? ['src/**/*.test.ts']
      // Par défaut : logique pure + contrat HTTP (aucune base requise).
      : ['src/**/permissions.test.ts', 'src/**/gameEconomy.test.ts', 'src/test/api.contract.test.ts', 'src/core/logger.test.ts'],
    environment: 'node',
    testTimeout: 15000,
  },
});
