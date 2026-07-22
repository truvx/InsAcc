// PM2 Ecosystem Process Manager Configuration for InsAcc REST API Backend [To Be Implemented]
// File: /etc/pm2/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'insacc-api',
      script: './dist/server.js',
      instances: 'max',               // Cluster mode across all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',       // Restart worker if memory exceeds 1 GB
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      error_file: '/var/log/insacc/pm2-error.log',
      out_file: '/var/log/insacc/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
