const path = require('path')

module.exports = {
  apps: [
    {
      name: 'language-app',
      script: path.join(__dirname, 'bin', 'www'),
      env: {
        NODE_ENV: 'production',
        PORT: 13010,
      },
      // Memory management settings
      max_memory_restart: '350M', // Restart if memory exceeds 350MB
      kill_timeout: 3000, // Allow 3 seconds for graceful shutdown
      output: '/home/william/logs/language-app.log',
      merge_logs: true,
      instances: 1,
    },
  ],
}
