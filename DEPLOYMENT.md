# Deployment Guide: Render

This guide covers deploying Baymax IT Care to Render (free tier):
- **Frontend**: Render Static Site
- **Backend**: Render Web Service
- **Database**: Render PostgreSQL

## Architecture

```
┌─────────────────────────┐                        ┌──────────────────────────┐
│   Render Static Site    │  ◄──── HTTPS ────►    │   Render Web Service     │
│   (Frontend)            │                        │   (Backend)              │
│   React + Vite          │                        │   Express + Node.js      │
│   baymax-frontend       │                        │   baymax-api             │
└─────────────────────────┘                        └────────────┬─────────────┘
                                                                │
                                                                │ DATABASE_URL
                                                                ▼
                                                   ┌──────────────────────────┐
                                                   │   Render PostgreSQL      │
                                                   │   baymax-db              │
                                                   │   (managed database)     │
                                                   └──────────────────────────┘
```

## Prerequisites

- A Render account (free)
- Git repository with your code (GitHub, GitLab, etc.)

---

## Part 1: Deploy Using Blueprint (Recommended)

The easiest way to deploy is using the `render.yaml` Blueprint:

### 1.1 Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Deploy via Render Dashboard

1. Go to [render.com](https://render.com) and sign in
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and show:
   - `baymax-api` (Web Service)
   - `baymax-frontend` (Static Site)
   - `baymax-db` (PostgreSQL)
5. Click **Apply** to deploy all services

### 1.3 Configure Environment Variables

After deployment, update the environment variables:

**Backend (baymax-api):**
1. Go to baymax-api → Environment
2. Set `FRONTEND_URL` to your frontend URL:
   ```
   https://baymax-frontend.onrender.com
   ```

**Frontend (baymax-frontend):**
1. Go to baymax-frontend → Environment
2. Set `VITE_API_URL` to your backend URL:
   ```
   https://baymax-api.onrender.com/api
   ```
3. Trigger a redeploy for the change to take effect

### 1.4 Create Admin User

1. Go to baymax-api → Shell
2. Run the seed script:
   ```bash
   npm run seed:admin
   ```
3. Note the generated password from the output

---

## Part 2: Manual Deployment

If you prefer to set up services manually:

### 2.1 Create PostgreSQL Database

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. Configure:
   - **Name**: baymax-db
   - **Region**: Oregon (or your preference)
   - **Plan**: Free
3. Create and note the **Internal Database URL**

### 2.2 Create Backend Web Service

1. Go to **New** → **Web Service**
2. Connect your repository
3. Configure:
   - **Name**: baymax-api
   - **Region**: Same as database
   - **Runtime**: Node
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
4. Add environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (paste Internal Database URL)
   - `FRONTEND_URL`: (set after frontend deploys)
   - `SESSION_SECRET`: (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `TRUST_PROXY`: `true`
5. Set **Health Check Path**: `/api/health`

### 2.3 Create Frontend Static Site

1. Go to **New** → **Static Site**
2. Connect your repository
3. Configure:
   - **Name**: baymax-frontend
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL`: `https://baymax-api.onrender.com/api`

### 2.4 Update Backend CORS

After frontend deploys, go back to baymax-api and set:
- `FRONTEND_URL`: `https://baymax-frontend.onrender.com`

---

## Verification

### Test the Backend

```bash
curl https://baymax-api.onrender.com/api/health
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

Visit your frontend URL and submit a rating.

---

## Local Development

### Prerequisites

- PostgreSQL installed locally (or Docker)
- Node.js 18+

### Setup

1. Create a local PostgreSQL database:
   ```bash
   createdb baymax
   ```

2. Copy environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Update `DATABASE_URL` in `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/baymax
   ```

4. Install dependencies and run:
   ```bash
   # Terminal 1: Backend
   cd backend && npm install && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm install && npm run dev
   ```

5. Create admin user:
   ```bash
   cd backend && npm run seed:admin
   ```

---

## Troubleshooting

### CORS Errors
- Check `FRONTEND_URL` in backend environment matches your frontend URL exactly
- Include the protocol (`https://`)
- No trailing slash

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check database is running (Render dashboard → baymax-db)
- For local dev, ensure PostgreSQL is running

### Cold Starts (Free Tier)
- Free tier services spin down after 15 minutes of inactivity
- First request may take 30+ seconds
- Consider using a service like UptimeRobot to ping `/api/health` every 14 minutes

### Logs
- Go to Render Dashboard → Your Service → Logs
- Check for startup errors or request failures

---

## Quick Reference

| Component | Local URL | Production URL |
|-----------|-----------|----------------|
| Frontend | http://localhost:5173 | https://baymax-frontend.onrender.com |
| Backend | http://localhost:3001 | https://baymax-api.onrender.com |
| Health Check | http://localhost:3001/api/health | https://baymax-api.onrender.com/api/health |

---

## Free Tier Limitations

- **Web Services**: Spin down after 15 min inactivity (cold start ~30s)
- **PostgreSQL**: 256MB storage, 97-day retention, then deleted
- **Build Time**: 500 minutes/month
- **Bandwidth**: 100GB/month

---

## Security Notes

- Backend uses Helmet for security headers
- Rate limiting: 20 submissions/15min, 100 requests/15min per IP
- CORS restricted to specified origins only
- PostgreSQL connection uses SSL in production
- Session cookies are secure and httpOnly in production
