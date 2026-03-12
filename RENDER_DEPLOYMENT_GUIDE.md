# Render Deployment Guide (Workspace Setup)

This repo is an **npm workspaces** project with two apps:

- `client/` = Frontend (Vite)
- `server/` = Backend API (Express)

Local dev ports (from `.env` files):

- Backend: `http://localhost:3006` (`server/.env` -> `PORT=3006`)
- Frontend: `http://localhost:5173` (`client/.env` / `vite.config.ts` -> `5173`)

## 1) Backend (Render Web Service)

### Service type
- **Web Service**

### Root Directory
- `server`

### Build Command
```bash
npm install
npm run build
```

### Start Command
```bash
npm start
```

### Required Environment Variables
Set these in Render Dashboard (do not rely on local `.env` files):

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=YOUR_NEON_POSTGRES_URL
CLIENT_URL=https://YOUR_FRONTEND.onrender.com
JWT_SECRET=SET_A_STRONG_SECRET
JWT_REFRESH_SECRET=SET_A_STRONG_SECRET
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

# If using email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_SMTP_USER
SMTP_PASS=YOUR_SMTP_APP_PASSWORD
SMTP_FROM=Campus <noreply@yourdomain.com>

# If using Backblaze B2
BLACKBLAZE_KEY_ID=YOUR_KEY
BLACKBLAZE_APPLICATION_KEY=YOUR_KEY
BLACKBLAZE_BUCKET_NAME=YOUR_BUCKET
BLACKBLAZE_ENDPOINT=YOUR_ENDPOINT
BLACKBLAZE_REGION=auto
```

### Notes
- This backend is configured to run **API-only in production** unless `SERVE_CLIENT=1` is explicitly set.
- Health endpoint:
  - `GET /api/health`

## 2) Frontend (Render Static Site)

### Service type
- **Static Site**

### Root Directory
- `client`

### Build Command
```bash
npm install
npm run build
```

### Publish Directory
- `dist`

### Environment Variables (Render)
```env
VITE_API_BASE_URL=https://YOUR_BACKEND.onrender.com
VITE_DEV_PORT=5173
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

## 3) Local Development (workspaces)

From repo root:

```bash
npm install
npm run dev:server
npm run dev:client
```

Or run both:

```bash
npm run dev
```

## 4) Production Build Verification (local)

From repo root:

```bash
npm run build
```

Outputs:
- Frontend: `client/dist`
- Backend: `server/dist/index.js`

## 5) Security Checklist (Important)

- Do **not** commit any `.env` files.
- Rotate secrets if they were ever shared or committed:
  - `DATABASE_URL`
  - SMTP credentials
  - Backblaze keys
  - `JWT_SECRET` / `JWT_REFRESH_SECRET`
