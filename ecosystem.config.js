// ecosystem.config.js — PM2 · Kýdos Belote sur VPS 217.160.186.250
//
// Prérequis (une seule fois) :
//   sudo mkdir -p /var/log/kydos && sudo chown $USER /var/log/kydos
//   cp .env.vps.example server/.env
//   cp .env.vps.example mobile/.env.production
//   npm install
//   cd mobile && npm run build && cd ..
//
// Lancer :
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup   (copier-coller la commande sudo affichée)
//
// URLs finales :
//   Jeu : http://217.160.186.250:8881
//   API : http://217.160.186.250:8882/api/health

module.exports = {
  apps: [
    {
      name: 'kydos-api',
      cwd: './server',
      script: './node_modules/.bin/tsx',
      args: 'src/index.ts',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      restart_delay: 3000,
      max_memory_restart: '512M',
      out_file: '/var/log/kydos/api-out.log',
      error_file: '/var/log/kydos/api-err.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: 8882,
        MONGO_URI: 'mongodb://root:toor@127.0.0.1:27017/beloteKydosV14?authSource=admin',
        JWT_SECRET: 'change-moi-avec-openssl-rand-hex-32-svp-64-chars-mini-obligatoire',
        CORS_ORIGIN: '*',
        REDIS_URL: '',
      },
    },
    {
      name: 'kydos-mobile',
      cwd: './mobile',
      script: './node_modules/.bin/vite',
      args: 'preview --host 0.0.0.0 --port 8881 --strictPort',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '256M',
      out_file: '/var/log/kydos/mobile-out.log',
      error_file: '/var/log/kydos/mobile-err.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};