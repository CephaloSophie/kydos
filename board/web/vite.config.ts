import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  server: {
    port: 4200,
    host: '0.0.0.0',
    proxy: {
      // L'API tourne sur 4100 (voir board/server/.env). Le front la proxifie.
      '/api': { target: 'http://127.0.0.1:4100', changeOrigin: true },
    },
  },
});
