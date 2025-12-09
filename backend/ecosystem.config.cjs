// PM2 Ecosystem Configuration
// This configuration manages the Node.js server and Cloudflare tunnel as persistent services
// Processes will survive SSH disconnections and automatically restart on failure

const path = require('path');
const os = require('os');
const fs = require('fs');

// Ensure logs directory exists with proper error handling
const logsDir = path.join(__dirname, 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('PM2: Created logs directory at', logsDir);
  }
} catch (err) {
  console.error('PM2: Failed to create logs directory:', err.message);
  console.error('PM2: Logs will be written to default PM2 log location');
  // Don't fail - PM2 will use default log locations if these paths don't work
}

// Find the Cloudflare tunnel config
function findTunnelConfig() {
  const cloudflaredDir = path.join(os.homedir(), '.cloudflared');
  try {
    const files = fs.readdirSync(cloudflaredDir);
    const configFile = files.find(f => f.startsWith('config-') && f.endsWith('.yml'));
    if (configFile) {
      return path.join(cloudflaredDir, configFile);
    }
    console.warn('PM2: No tunnel config file found in ~/.cloudflared');
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn('PM2: ~/.cloudflared directory does not exist');
    } else if (e.code === 'EACCES') {
      console.error('PM2: Permission denied reading ~/.cloudflared');
    } else {
      console.error('PM2: Error reading tunnel config:', e.message);
    }
  }
  return null;
}

const tunnelConfig = findTunnelConfig();

const apps = [
  {
    name: 'baymax-backend',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    // Logging with rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: path.join(logsDir, 'backend-error.log'),
    out_file: path.join(logsDir, 'backend-out.log'),
    merge_logs: true,
    // Log rotation
    log_type: 'json',
    // Graceful shutdown - server.js will handle SIGINT/SIGTERM
    kill_timeout: 5000
  }
];

// Add Cloudflare tunnel if config exists
if (tunnelConfig) {
  apps.push({
    name: 'baymax-tunnel',
    script: 'cloudflared',
    args: ['tunnel', '--config', tunnelConfig, 'run'],
    interpreter: 'none',
    autorestart: true,
    watch: false,
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: path.join(logsDir, 'tunnel-error.log'),
    out_file: path.join(logsDir, 'tunnel-out.log'),
    merge_logs: true,
    log_type: 'json',
    // Restart delay if tunnel crashes
    restart_delay: 5000
  });
}

module.exports = { apps };
