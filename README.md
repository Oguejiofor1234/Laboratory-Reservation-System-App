# 🔬 Lab 1780 — Equipment Reservation System

> A production-ready, full-stack equipment reservation platform for Laboratory 1780 with online booking, email notifications, real-time updates, and a complete DevSecOps CI/CD pipeline.

![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Backend](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![Database](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![CI/CD](https://img.shields.io/badge/GitHub-Actions-2088FF?logo=github-actions)

---

## ✨ Features

### Student
- Register with email + role selection (Student / Technologist)
- 4-step booking flow: Equipment → Experience → Details → Confirm
- Training gate: first-time users must complete training before booking
- Date/time slot picker with real-time availability indicators
- 24-hour cancellation policy enforced
- Dashboard: upcoming reservations, certifications, training sessions, history
- Waitlist: join queue when equipment is fully booked

### Technologist
- Dashboard: pending reservation requests with one-click confirm/reject
- Training session management: confirm → complete → auto-issue certification
- Equipment management: add/edit, toggle maintenance mode
- Utilization analytics per equipment
- Bulk reservation actions

### Shared
- **Email notifications**: booking request, confirmation, rejection, cancellation, training updates, 24h reminder, waitlist alert, password reset
- **In-app notifications**: real-time bell with unread count badge (Socket.io)
- **Language switcher**: EN / FR toggle in navbar, persisted to localStorage
- **Audit log**: all state changes recorded with user + IP
- **API docs**: Swagger/OpenAPI at `/api/docs`

---

## 🏗️ Architecture

```
GitHub Push
    ↓
Semgrep SAST + CodeQL
    ↓
Trivy FS Scan
    ↓
Backend Tests (Jest)
    ↓
Docker Build (backend + frontend)
    ↓
Trivy Image Scan
    ↓
Docker Hub
    ↓
Render Deploy (via webhook)
```

**Services** (docker-compose, local dev):
- `postgres:16-alpine` — database
- `backend` — Express API on `:5000`
- `frontend` — Vite dev server on `:5173`
- `nginx` — reverse proxy on `:80`

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 18+ and npm
- Docker + Docker Compose
- Git

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/lab1780-reservation.git
cd lab1780-reservation
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) below).

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts Postgres, backend (nodemon), frontend (Vite), and nginx.

**First run — run migrations and seed:**

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run prisma:seed
```

Open **http://localhost** in your browser.

### 3. OR run without Docker

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

**Frontend (new terminal):**
```bash
cd frontend
npm install
npm run dev
```

Backend: http://localhost:5000 | Frontend: http://localhost:5173

---

## 🔐 Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Technologist | `tech@lab1780.edu` | `Tech@1780!` |
| Student | `student@lab1780.edu` | `Student@1780!` |

---

## 🌐 Environment Variables

### Backend (`.env` in project root)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | JWT signing key (≥32 chars) | — |
| `JWT_REFRESH_SECRET` | Refresh token signing key | — |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_SECURE` | Use TLS | `false` |
| `EMAIL_USER` | SMTP username | `you@gmail.com` |
| `EMAIL_PASS` | SMTP password / app password | — |
| `EMAIL_FROM` | From address | `"Lab 1780" <you@gmail.com>` |
| `CLIENT_URL` | Frontend URL (for CORS + email links) | `http://localhost:5173` |

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOCKET_URL` | Socket.io server URL |

---

## ☁️ Deployment on Render (Free Tier)

### Database — Neon.tech (recommended)
1. Sign up at [neon.tech](https://neon.tech) — free tier, 0.5GB, no expiry
2. Create a new project and copy the connection string
3. Set it as `DATABASE_URL` in Render environment variables

### Backend — Render Web Service
1. New → Web Service → Docker image from Docker Hub
2. Image: `your-dockerhub-username/lab1780-backend:latest`
3. Set environment variables (all from `.env.example` backend section)
4. Start command: `sh -c "npx prisma migrate deploy && node server.js"`
5. Copy the deploy hook URL → add as `RENDER_DEPLOY_HOOK_BACKEND` in GitHub Secrets

### Frontend — Render Static Site
1. New → Static Site → Docker image
2. Image: `your-dockerhub-username/lab1780-frontend:latest`
3. Set `VITE_API_URL` = your Render backend URL + `/api`
4. Copy the deploy hook URL → add as `RENDER_DEPLOY_HOOK_FRONTEND` in GitHub Secrets

---

## 🔑 GitHub Secrets Required

Go to your repo → **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (Settings → Security) |
| `RENDER_DEPLOY_HOOK_BACKEND` | Render deploy hook URL for backend service |
| `RENDER_DEPLOY_HOOK_FRONTEND` | Render deploy hook URL for frontend service |
| `VITE_API_URL` | Production API URL (e.g. `https://lab1780-api.onrender.com/api`) |
| `VITE_SOCKET_URL` | Production socket URL (e.g. `https://lab1780-api.onrender.com`) |
| `SEMGREP_APP_TOKEN` | (Optional) Semgrep Cloud token for dashboard |

---

## 📁 Project Structure

```
lab1780-reservation/
├── .github/workflows/ci-cd.yml     # CI/CD pipeline
├── frontend/                        # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── components/             # common/, booking/
│   │   ├── context/                # AuthContext, NotificationContext
│   │   ├── locales/                # en.json, fr.json
│   │   ├── pages/                  # Landing, Login, Register, BookingFlow, Dashboard
│   │   └── utils/                  # api.js, i18n.js, constants.js
│   ├── Dockerfile                  # Multi-stage: Vite build → nginx
│   └── nginx.conf
├── backend/                         # Node.js + Express
│   ├── src/
│   │   ├── config/                 # database, email, socket, swagger
│   │   ├── controllers/            # auth, equipment, reservations, training, notifications, dashboard
│   │   ├── middleware/             # auth, rateLimiter, validate, errorHandler, auditLog
│   │   ├── routes/                 # REST API routes
│   │   └── services/               # emailService, notificationService, conflictDetection, trainingGate, cronJobs
│   ├── prisma/schema.prisma        # Database models
│   ├── prisma/seed.js              # Demo data
│   ├── tests/                      # Jest + Supertest
│   └── Dockerfile                  # Multi-stage: build → production
├── nginx/nginx.conf                 # Local dev reverse proxy
├── docker-compose.yml               # Local dev stack
├── docker-compose.prod.yml          # Production override
└── .env.example                     # All env vars documented
```

---

## 🧪 Running Tests

```bash
cd backend
npm test              # Run all tests
npm run test:coverage # With coverage report
```

---

## 🌍 Language Switcher

The frontend includes an **EN / FR** toggle in the navbar. 
- Click the `EN | FR` pill in the top-right to switch instantly
- Selection is persisted to `localStorage` (key: `lab1780-lang`)
- All UI strings are translated including: navigation, booking flow, dashboard, notifications, error messages, and status labels
- The notification bell shows relative times in the selected language (via `date-fns` locale)

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Gmail account
2. Go to **Google Account → Security → 2-Step Verification → App passwords**
3. Generate an app password for "Mail"
4. Set `EMAIL_USER=your@gmail.com` and `EMAIL_PASS=<app-password>` in `.env`

---

## 🛡️ Security Features

- JWT access tokens (15min) + httpOnly refresh tokens (7 days) with rotation
- bcrypt password hashing (12 rounds)
- Email verification required before booking
- Rate limiting: 10 auth attempts / 200 general requests per 15 minutes
- Helmet.js security headers
- CORS restricted to `CLIENT_URL`
- Prisma parameterized queries (no SQL injection)
- Audit log for all state-changing operations
- Non-root Docker user

---

## 📜 API Documentation

When running locally, visit: **http://localhost:5000/api/docs**

---

## 🤝 Contributing

1. Create a branch: `git checkout -b feat/your-feature`
2. Commit: `git commit -m "feat: add your feature"`
3. Push and open a PR against `main`

---

*Built for Lab 1780 · Co-Authored-By: Oz <oz-agent@warp.dev>*
