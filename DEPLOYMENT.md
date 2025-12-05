# Deployment Guide: Vercel Frontend + RPi5 Backend

This guide covers deploying Baymax IT Care with:
- **Frontend**: Vercel (free tier)
- **Backend**: Raspberry Pi 5 with Cloudflare Tunnel (free tier)

## Architecture

```
┌─────────────────────────┐         HTTPS          ┌──────────────────────────┐
│   Vercel (Frontend)     │ ◄────────────────────► │   Cloudflare Tunnel      │
│   React + Vite          │                        │                          │
│   baymax.vercel.app     │                        │   api.lydawei.com        │
└─────────────────────────┘                        └────────────┬─────────────┘
                                                                │
                                                                │ localhost:3001
                                                                ▼
                                                   ┌──────────────────────────┐
                                                   │   Raspberry Pi 5         │
                                                   │   Express + SQLite       │
                                                   │   (your local server)    │
                                                   └──────────────────────────┘
```

## Prerequisites

- A Cloudflare account (free)
- A domain added to Cloudflare
- Node.js 18+ on your RPi5
- A Vercel account (free)

---

## Part 1: Backend Setup (Raspberry Pi 5)

### 1.1 Install cloudflared

```bash
# Download for ARM64 (RPi5)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb

# Verify installation
cloudflared --version
```

### 1.2 Clone and Setup Backend

```bash
# Clone your repo (or copy the backend folder)
cd ~
git clone <your-repo-url> baymax-it-care
cd baymax-it-care/backend

# Install dependencies
npm install
```

### 1.3 Setup Cloudflare Tunnel

Run the interactive setup script:

```bash
npm run setup:tunnel
```

This will:
1. Authenticate with Cloudflare (opens browser)
2. Create a named tunnel
3. Configure DNS routing to your subdomain
4. Generate the config files

**Example interaction:**
```
Enter a name for your tunnel: baymax-api
Enter the subdomain to use: api.lydawei.com
```

### 1.4 Update CORS for Vercel

After the setup script creates `.env`, update the `FRONTEND_URL`:

```bash
nano .env
```

Set it to your Vercel URL (you'll get this after deploying frontend):
```
FRONTEND_URL=https://your-app.vercel.app,http://localhost:5173
```

### 1.5 Start Production Server

```bash
npm run production
```

This starts both the Node.js server and the Cloudflare Tunnel.

### 1.6 (Optional) Run as Systemd Service

For auto-start on boot:

```bash
# Create service file for the Node.js app
sudo nano /etc/systemd/system/baymax-backend.service
```

```ini
[Unit]
Description=Baymax IT Care Backend
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/baymax-it-care/backend
EnvironmentFile=/home/pi/baymax-it-care/backend/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Install cloudflared as a service (uses config from ~/.cloudflared/)
sudo cloudflared service install

# Enable and start services
sudo systemctl enable baymax-backend cloudflared
sudo systemctl start baymax-backend cloudflared

# Check status
sudo systemctl status baymax-backend cloudflared
```

**Note**: Adjust `User` and `WorkingDirectory` paths to match your setup.

---

## Part 2: Frontend Setup (Vercel)

### 2.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 2.2 Deploy to Vercel

**Option A: Via CLI**
```bash
cd frontend
vercel
```

Follow the prompts:
- Link to existing project? No
- Project name: baymax-it-care (or your preference)
- Framework: Vite
- Build command: npm run build
- Output directory: dist

**Option B: Via GitHub Integration**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Set root directory to `frontend`
6. Vercel auto-detects Vite settings

### 2.3 Configure Environment Variable

In the Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://api.lydawei.com/api` (your Cloudflare Tunnel URL)
   - **Environment**: Production (and Preview if desired)
3. Redeploy for changes to take effect

### 2.4 Update Backend CORS

Now that you have your Vercel URL (e.g., `baymax-it-care.vercel.app`):

1. SSH into your RPi5
2. Update `backend/.env`:
   ```
   FRONTEND_URL=https://baymax-it-care.vercel.app,http://localhost:5173
   ```
3. Restart the backend:
   ```bash
   sudo systemctl restart baymax-backend
   # or if running manually, Ctrl+C and npm run production
   ```

---

## Verification

### Test the Backend
```bash
curl https://api.lydawei.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Hello. I am Baymax, your personal IT healthcare companion. I am fully operational.",
  "uptime": 123.456,
  "database": "connected"
}
```

### Test the Frontend
Visit your Vercel URL and submit a rating.

---

## Troubleshooting

### CORS Errors
- Check `FRONTEND_URL` in backend `.env` matches your Vercel URL exactly
- Include the protocol (`https://`)
- No trailing slash

### Tunnel Not Connecting
```bash
# Check tunnel status
cloudflared tunnel list

# Test tunnel locally
cloudflared tunnel --config ~/.cloudflared/config-baymax-api.yml run
```

### Database Issues
```bash
# Check database exists
ls -la backend/ratings.db

# Check permissions
chmod 644 backend/ratings.db
```

### Logs
```bash
# Backend logs (if using systemd)
sudo journalctl -u baymax-backend -f

# Cloudflared logs
sudo journalctl -u cloudflared -f
```

---

## Quick Reference

| Component | URL | Command |
|-----------|-----|---------|
| Frontend (local) | http://localhost:5173 | `cd frontend && npm run dev` |
| Backend (local) | http://localhost:3001 | `cd backend && npm run dev` |
| Frontend (prod) | https://baymax.vercel.app | Deployed via Vercel |
| Backend (prod) | https://api.lydawei.com | `npm run production` |

---

## Security Notes

- The backend uses Helmet for security headers
- Rate limiting: 20 submissions/15min, 100 requests/15min per IP
- CORS restricted to specified origins only
- Cloudflare provides DDoS protection and SSL termination
- SQLite database should be backed up regularly
