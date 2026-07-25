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
    environment: 'node',
    environmentMatchGlobs: [['src/test/**', 'happy-dom'], ['src/presentation/**', 'happy-dom']],
    include: ['src/**/*.test.ts'],
  },
});
