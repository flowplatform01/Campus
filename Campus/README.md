# Campus - School Management & Educational Social Platform

A full SaaS platform combining advanced school management with educational social media. Built with React, TypeScript, Express, Neon PostgreSQL, and Drizzle ORM.

## Features

- **Authentication**: Registration, login, email verification, password reset, JWT sessions
- **Roles**: Admin, Student, Parent, Employee (with sub-roles: teacher, principal, bursar, etc.)
- **School Management**: Grades, assignments, attendance, schedules
- **Social Media**: Posts, comments, likes, communities
- **Real-time**: Socket.IO for chat and notifications
- **File Storage**: Backblaze B2 for documents; Neon for public asset URLs
- **Email**: Google SMTP for verification, reset, invitations

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Ensure `server/.env` contains:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT signing secrets
- `CLIENT_URL` - Frontend URL (e.g. http://localhost:5000)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Gmail SMTP
- `BLACKBLAZE_*` - Backblaze B2 credentials (optional for file uploads)

Ensure `client/.env` contains:

- `VITE_API_BASE_URL` - Backend API URL (e.g. http://localhost:3001)

### 3. Push database schema

```bash
npm run db:push
```

### 4. Run development

```bash
npm run dev
```

- Server runs on `PORT` (default 3001)
- In development, Vite serves the client on the same port via middleware

### 5. Production build

```bash
npm run build
npm start
```

### Separate deployments

- **Client only**: `npm run build:client` - outputs to `dist/public`
- **Server only**: `npm run build:server` - outputs to `dist/`

For separate deployments:
- Deploy client as static site (Vercel, Netlify, etc.)
- Deploy server as Node.js app (Railway, Render, etc.)
- Set `VITE_API_BASE_URL` to your production API URL
- Set `CLIENT_URL` in server to your production client URL

## Project structure

```
├── client/          # React frontend
├── server/          # Express backend
│   ├── routes/      # API routes
│   ├── services/    # Email, storage
│   └── middleware/  # Auth
├── shared/          # Drizzle schema
└── migrations/      # DB migrations (generated)
```
