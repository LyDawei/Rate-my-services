#!/bin/bash
# Cloudflare Tunnel Setup Script for Baymax IT Care Backend
# Run this once to configure your tunnel

set -e

echo "🤖 Baymax IT Care - Cloudflare Tunnel Setup"
echo "============================================"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed."
    echo ""
    echo "Install it based on your system:"
    echo ""
    echo "  Raspberry Pi / Debian / Ubuntu:"
    echo "    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb"
    echo "    sudo dpkg -i cloudflared.deb"
    echo ""
    echo "  macOS:"
    echo "    brew install cloudflared"
    echo ""
    echo "  Other: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
fi

echo "✅ cloudflared is installed ($(cloudflared --version 2>&1 | head -1))"
echo ""

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Installing is recommended for better parsing."
    echo "   Install with: sudo apt install jq (Debian/Ubuntu) or brew install jq (macOS)"
    echo ""
    USE_JQ=false
else
    USE_JQ=true
fi

# Check if already logged in
if cloudflared tunnel list &> /dev/null; then
    echo "✅ Already authenticated with Cloudflare"
else
    echo "📝 You need to authenticate with Cloudflare."
    echo "   This will open a browser window."
    echo ""
    read -p "Press Enter to continue..."
    cloudflared tunnel login
fi

echo ""
echo "🔧 Creating tunnel..."
echo ""

# Prompt for tunnel name
read -p "Enter a name for your tunnel (e.g., baymax-api): " TUNNEL_NAME

if [ -z "$TUNNEL_NAME" ]; then
    TUNNEL_NAME="baymax-api"
fi

# Check if tunnel already exists
echo "Checking for existing tunnel..."
if $USE_JQ; then
    EXISTING_ID=$(cloudflared tunnel list --output json 2>/dev/null | jq -r ".[] | select(.name==\"$TUNNEL_NAME\") | .id" 2>/dev/null || echo "")
else
    EXISTING_ID=$(cloudflared tunnel list 2>/dev/null | grep -w "$TUNNEL_NAME" | awk '{print $1}' || echo "")
fi

if [ -n "$EXISTING_ID" ]; then
    echo "⚠️  Tunnel '$TUNNEL_NAME' already exists (ID: $EXISTING_ID)"
    read -p "Use existing tunnel? (y/n): " USE_EXISTING
    if [ "$USE_EXISTING" = "y" ] || [ "$USE_EXISTING" = "Y" ]; then
        TUNNEL_ID="$EXISTING_ID"
        echo "Using existing tunnel."
    else
        echo "Please choose a different tunnel name."
        exit 1
    fi
else
    # Create the tunnel
    if ! cloudflared tunnel create "$TUNNEL_NAME" 2>&1 | tee /tmp/tunnel-create.log; then
        echo "❌ Failed to create tunnel. Check the output above."
        exit 1
    fi

    # Get the new tunnel ID
    if $USE_JQ; then
        TUNNEL_ID=$(cloudflared tunnel list --output json 2>/dev/null | jq -r ".[] | select(.name==\"$TUNNEL_NAME\") | .id")
    else
        TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep -w "$TUNNEL_NAME" | awk '{print $1}')
    fi
fi

if [ -z "$TUNNEL_ID" ]; then
    echo "❌ Failed to get tunnel ID"
    exit 1
fi

echo ""
echo "✅ Tunnel '$TUNNEL_NAME' ready!"
echo "   Tunnel ID: $TUNNEL_ID"
echo ""

# Verify credentials file exists
CREDS_FILE="$HOME/.cloudflared/$TUNNEL_ID.json"
if [ ! -f "$CREDS_FILE" ]; then
    echo "❌ Credentials file not found: $CREDS_FILE"
    echo "   This might happen if using an existing tunnel created on another machine."
    echo "   You may need to recreate the tunnel."
    exit 1
fi

echo "✅ Credentials file found"
echo ""

# Prompt for domain
echo "📝 Now you need to route a domain to this tunnel."
echo "   You need a domain added to Cloudflare."
echo ""
read -p "Enter the subdomain to use (e.g., api.yourdomain.com): " TUNNEL_DOMAIN

if [ -z "$TUNNEL_DOMAIN" ]; then
    echo "❌ Domain is required"
    exit 1
fi

# Check if DNS route already exists
echo "Setting up DNS route..."
if cloudflared tunnel route dns "$TUNNEL_NAME" "$TUNNEL_DOMAIN" 2>&1 | tee /tmp/tunnel-dns.log; then
    echo "✅ DNS route configured: $TUNNEL_DOMAIN -> $TUNNEL_NAME"
else
    if grep -q "already exists" /tmp/tunnel-dns.log 2>/dev/null; then
        echo "✅ DNS route already exists: $TUNNEL_DOMAIN -> $TUNNEL_NAME"
    else
        echo "⚠️  DNS route setup had issues. Check the output above."
        echo "   You may need to manually configure DNS in Cloudflare dashboard."
    fi
fi

echo ""

# Create config file
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config-$TUNNEL_NAME.yml"

mkdir -p "$CONFIG_DIR"

# Get PORT from environment or use default
BACKEND_PORT="${PORT:-3001}"

cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDS_FILE

ingress:
  - hostname: $TUNNEL_DOMAIN
    service: http://localhost:$BACKEND_PORT
  - service: http_status:404
EOF

echo "✅ Config file created: $CONFIG_FILE"
echo ""

# Create .env file for backend
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup"
fi

cat > "$BACKEND_DIR/.env" << EOF
# Baymax IT Care - Backend Production Configuration
# Generated by setup-tunnel.sh on $(date)

PORT=$BACKEND_PORT

# Your Vercel frontend URL (update after deploying to Vercel)
# Supports multiple origins separated by commas
FRONTEND_URL=https://your-app.vercel.app,http://localhost:5173

# Database path
DATABASE_PATH=./ratings.db

# Tunnel configuration (for reference)
# TUNNEL_NAME=$TUNNEL_NAME
# TUNNEL_ID=$TUNNEL_ID
# TUNNEL_DOMAIN=$TUNNEL_DOMAIN
# CONFIG_FILE=$CONFIG_FILE
EOF

echo "✅ Created .env file in backend directory"
echo ""
echo "============================================"
echo "🎉 Setup complete!"
echo "============================================"
echo ""
echo "Your API will be available at: https://$TUNNEL_DOMAIN/api"
echo ""
echo "Next steps:"
echo ""
echo "1. Deploy frontend to Vercel (see DEPLOYMENT.md)"
echo ""
echo "2. Update FRONTEND_URL in backend/.env with your Vercel URL:"
echo "   FRONTEND_URL=https://your-app.vercel.app"
echo ""
echo "3. Start the backend + tunnel:"
echo "   cd backend && npm run production"
echo ""
echo "4. (Optional) Install as systemd service for auto-start on boot"
echo "   See DEPLOYMENT.md for instructions"
echo ""
echo "============================================"
