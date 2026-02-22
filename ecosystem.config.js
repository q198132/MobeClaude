module.exports = {
  apps: [{
    name: 'mobeclaude',
    script: 'start.js',
    cwd: __dirname,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_size: '10M',
    retain: 3,
  }],
};
