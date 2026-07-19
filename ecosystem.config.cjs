// ============================================================================
//  PM2 — Belote Contrée
//  Lance le backend (prod / debug) et le frontend (preview/dev) via PM2.
//
//  Usage :
//    pm2 start ecosystem.config.cjs --only belote-api          # backend prod
//    pm2 start ecosystem.config.cjs --only belote-api-debug    # backend debug (inspector :9229)
//    pm2 start ecosystem.config.cjs --only belote-web          # frontend (Vite preview, build requis)
//    pm2 start ecosystem.config.cjs --only belote-web-dev      # frontend dev (HMR)
//    pm2 logs belote-api        |  pm2 restart belote-api  |  pm2 stop all  |  pm2 delete all
//    pm2 save && pm2 startup    # persister au reboot du VPS
//
//  Les variables d'environnement sont lues depuis server/.env (via dotenv dans le code).
//  Ce qui est défini ici les surcharge (utile pour fixer NODE_ENV / PORT par app).
// ============================================================================

const path = require('node:path');
const ROOT = __dirname;
const SERVER = path.join(ROOT, 'server');
const WEB = path.join(ROOT, 'web');

module.exports = {
  apps: [
    // ---- Backend : production -------------------------------------------------
    {
      name: 'belote-api',
      cwd: SERVER,
      script: 'npm',
      args: 'run start',                // tsx src/index.ts
      interpreter: 'none',
      env: { NODE_ENV: 'production', PORT: '4000' },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      time: true,
      merge_logs: true,
      out_file: path.join(ROOT, 'logs', 'api-out.log'),
      error_file: path.join(ROOT, 'logs', 'api-err.log'),
    },

    // ---- Backend : debug (inspector + watch) ---------------------------------
    {
      name: 'belote-api-debug',
      cwd: SERVER,
      script: './node_modules/.bin/tsx',
      args: 'watch --inspect=0.0.0.0:9229 src/index.ts',
      interpreter: 'none',
      env: { NODE_ENV: 'development', PORT: '4000', LOG_LEVEL: 'debug' },
      instances: 1,
      autorestart: true,
      watch: false,                     // tsx gère déjà le watch
      time: true,
      out_file: path.join(ROOT, 'logs', 'api-debug-out.log'),
      error_file: path.join(ROOT, 'logs', 'api-debug-err.log'),
    },

    // ---- Frontend : preview (sert le build de production) --------------------
    {
      name: 'belote-web',
      cwd: WEB,
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 5173',
      interpreter: 'none',
      env: { NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
      watch: false,
      time: true,
      out_file: path.join(ROOT, 'logs', 'web-out.log'),
      error_file: path.join(ROOT, 'logs', 'web-err.log'),
    },

    // ---- Frontend : dev (HMR, pour itérer en local) --------------------------
    {
      name: 'belote-web-dev',
      cwd: WEB,
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0 --port 5173',
      interpreter: 'none',
      env: { NODE_ENV: 'development' },
      instances: 1,
      autorestart: true,
      watch: false,
      time: true,
      out_file: path.join(ROOT, 'logs', 'web-dev-out.log'),
      error_file: path.join(ROOT, 'logs', 'web-dev-err.log'),
    },
  ],
};
