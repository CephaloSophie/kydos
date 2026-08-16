module.exports = {
  apps: [
    {
      name: 'kydos-backoffice-api',
      script: 'node',
      args: '--loader tsx src/index.ts',
      cwd: './server',
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 3001,
        MONGO_URI: 'mongodb://localhost:27017/beloteKydosV14',
        JWT_SECRET: 'CHANGE-ME-IN-PRODUCTION',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/backoffice-err.log',
      out_file: './logs/backoffice-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
