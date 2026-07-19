import { defineConfig } from 'vitest/config';

/** Tests unitaires PURS du moteur (aucune dépendance externe, aucun réseau). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
