#!/bin/bash
# Start Baymax IT Care Backend with Cloudflare Tunnel using PM2
# This script starts both the Node.js server and the tunnel as persistent services
# Processes will survive SSH disconnections and automatically restart on failure

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# Track if PM2 processes were started (for cleanup on error)
PM2_STARTED=false

# Cleanup function for errors
cleanup_on_error() {
    if [ "$PM2_STARTED" = true ]; then
        echo ""
        echo "Error occurred - cleaning up PM2 processes..."
        npx pm2 delete baymax-backend baymax-tunnel 2>/dev/null || true
    fi
}

# Trap ERR signal for cleanup
trap cleanup_on_error ERR

echo "==============================================="
echo "  Baymax IT Care - Production Start (PM2)"
echo "==============================================="
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "   Run 'npm run setup:tunnel' first."
    exit 1
fi

# Load environment variables safely
set -a
source .env
set +a

# Find the tunnel config
TUNNEL_CONFIGS=(~/.cloudflared/config-*.yml)
if [ ! -f "${TUNNEL_CONFIGS[0]}" ]; then
    echo "Error: No tunnel config found!"
    echo "   Run 'npm run setup:tunnel' first."
    exit 1
fi

# Use the first tunnel config found
TUNNEL_CONFIG="${TUNNEL_CONFIGS[0]}"

# Verify config file is readable
if [ ! -r "$TUNNEL_CONFIG" ]; then
    echo "Error: Cannot read tunnel config: $TUNNEL_CONFIG"
    exit 1
fi

echo "Using tunnel config: $TUNNEL_CONFIG"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$BACKEND_DIR/logs"

# Check if PM2 is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please ensure Node.js is installed."
    exit 1
fi

# Stop any existing processes
echo "Stopping any existing processes..."
npx pm2 delete baymax-backend baymax-tunnel 2>/dev/null || true

# Start with PM2
echo "Starting services with PM2..."
npx pm2 start ecosystem.config.cjs
PM2_STARTED=true

# Wait for backend to be healthy
echo ""
echo "Waiting for backend server to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
SERVER_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf "http://localhost:${PORT:-3001}/api/health" > /dev/null 2>&1; then
        SERVER_READY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ "$SERVER_READY" = false ]; then
    echo "Warning: Server health check timed out after ${MAX_RETRIES}s"
    echo "   Check logs with: npm run pm2:logs"
else
    echo "Backend server is healthy!"
fi

echo ""
echo "==============================================="
echo "  Baymax IT Care is now online!"
echo "==============================================="
echo ""
echo "PM2 Management Commands:"
echo "  npm run pm2:status  - View process status"
echo "  npm run pm2:logs    - View logs (live)"
echo "  npm run pm2:stop    - Stop all services"
echo "  npm run pm2:restart - Restart all services"
echo "  npm run pm2:monit   - Open PM2 monitor dashboard"
echo ""
echo "The services will persist after SSH disconnection."
echo "To make PM2 survive system reboots, run:"
echo "  npx pm2 save"
echo "  npx pm2 startup"
echo ""

# Show current status
npx pm2 status
