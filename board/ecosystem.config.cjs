/* =============================================================================
 * BORD — Configuration PM2
 * -----------------------------------------------------------------------------
 * Lance deux processus :
 *   • bord-api : API Express + Mongo (port 4100)
 *   • bord-web : SPA statique servie par vite preview (port 4200)
 *
 * Usage :
 *   cd board
 *   npm --prefix server install
 *   npm --prefix web install
 *   npm --prefix server run seed      # crée ameur + hamido + importe tasks.json
 *   npm --prefix web run build        # génère board/web/dist
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs
 *   pm2 restart bord-api
 *   pm2 stop all
 *   pm2 save && pm2 startup           # démarrage automatique au boot
 *
 * Prérequis :
 *   • MongoDB en écoute sur mongodb://root:toor@127.0.0.1:27017 (base : bordjira)
 *   • Node ≥ 20
 * ========================================================================== */
module.exports = {
  apps: [
    {
      name: 'bord-api',
      cwd: './server',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/main.ts',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: '4100',
        MONGO_URI: 'mongodb://root:toor@127.0.0.1:27017/bordjira?authSource=admin',
        JWT_SECRET: 'bord-dev-secret-change-in-production-please',
        CORS_ORIGIN: 'http://localhost:4200,http://127.0.0.1:4200',
      },
      out_file: './logs/api-out.log',
      error_file: './logs/api-err.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'bord-web',
      cwd: './web',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --host 0.0.0.0 --port 4200 --strictPort',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production' },
      out_file: './logs/web-out.log',
      error_file: './logs/web-err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
