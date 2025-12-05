#!/bin/bash
# Start Baymax IT Care Backend with Cloudflare Tunnel
# This script starts both the Node.js server and the tunnel

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

echo "🤖 Baymax IT Care - Production Start"
echo "====================================="
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
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
    echo "❌ No tunnel config found!"
    echo "   Run 'npm run setup:tunnel' first."
    exit 1
fi

# Use the first tunnel config found
TUNNEL_CONFIG="${TUNNEL_CONFIGS[0]}"

# Verify config file is readable
if [ ! -r "$TUNNEL_CONFIG" ]; then
    echo "❌ Cannot read tunnel config: $TUNNEL_CONFIG"
    exit 1
fi

echo "Using tunnel config: $TUNNEL_CONFIG"
echo ""

# PIDs for cleanup
NODE_PID=""
TUNNEL_PID=""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."

    # Graceful shutdown first
    if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
        kill "$NODE_PID" 2>/dev/null || true
    fi
    if [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
        kill "$TUNNEL_PID" 2>/dev/null || true
    fi

    # Wait a moment for graceful shutdown
    sleep 2

    # Force kill if still running
    if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
        echo "Force killing Node.js..."
        kill -9 "$NODE_PID" 2>/dev/null || true
    fi
    if [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
        echo "Force killing tunnel..."
        kill -9 "$TUNNEL_PID" 2>/dev/null || true
    fi

    echo "✅ Shutdown complete"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start the Node.js server
echo "Starting Node.js server..."
node server.js &
NODE_PID=$!

# Health check with retry
echo "Waiting for server to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
SERVER_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf "http://localhost:${PORT:-3001}/api/health" > /dev/null 2>&1; then
        SERVER_READY=true
        break
    fi

    # Check if process is still running
    if ! kill -0 "$NODE_PID" 2>/dev/null; then
        echo "❌ Node.js server crashed during startup!"
        exit 1
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ "$SERVER_READY" = false ]; then
    echo "❌ Server health check timed out after ${MAX_RETRIES}s"
    exit 1
fi

echo "✅ Node.js server is healthy (PID: $NODE_PID)"
echo ""

# Start the tunnel
echo "Starting Cloudflare Tunnel..."
cloudflared tunnel --config "$TUNNEL_CONFIG" run &
TUNNEL_PID=$!

# Wait a moment for tunnel to initialize
sleep 3

# Check if tunnel started
if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "❌ Cloudflare Tunnel failed to start!"
    exit 1
fi

echo "✅ Cloudflare Tunnel started (PID: $TUNNEL_PID)"
echo ""
echo "====================================="
echo "🎉 Baymax IT Care is now online!"
echo "====================================="
echo ""
echo "Press Ctrl+C to stop both services."
echo ""

# Wait for either process to exit
wait -n $NODE_PID $TUNNEL_PID 2>/dev/null || wait $NODE_PID $TUNNEL_PID
