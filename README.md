# 💸 ExpenseTracker

**A production-grade personal finance dashboard** built with the MERN stack. Track income and expenses, visualise spending patterns with interactive charts, set budgets with smart warnings, and automate recurring transactions — all in one clean, dark-themed interface.

[![Backend CI](https://github.com/gupta-akshar/Expense-Tracker-Pro/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/gupta-akshar/Expense-Tracker-Pro/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/gupta-akshar/Expense-Tracker-Pro/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/gupta-akshar/Expense-Tracker-Pro/actions/workflows/frontend-ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features

| Feature                    | Description                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| 🔐 **JWT Auth**            | Secure access + refresh token flow with httpOnly cookies and SHA-256 token hashing        |
| 💰 **Transactions**        | Full CRUD with pagination, search, filtering by category/date/type, and sort              |
| 📊 **Analytics**           | Income vs expense bar charts, category pie charts, monthly trend area charts              |
| 📁 **Categories**          | Custom income/expense categories with cascade-delete safety                               |
| 🎯 **Budgets**             | Per-category monthly budgets with real-time overspend warnings                            |
| 🔄 **Recurring**           | Scheduled transactions (daily/weekly/monthly/yearly) via cron with distributed locking    |
| 📱 **Responsive**          | Mobile-first design with collapsible sidebar and touch-friendly controls                  |
| 🛡️ **Production-hardened** | Rate limiting, Helmet security headers, input validation (Joi), structured logging (pino) |

---

## 🛠 Tech Stack

### Backend

| Layer      | Technology                               |
| ---------- | ---------------------------------------- |
| Runtime    | Node.js 20                               |
| Framework  | Express 5                                |
| Database   | MongoDB 7 + Mongoose 9                   |
| Auth       | JWT (access + refresh)                   |
| Validation | Joi 18                                   |
| Scheduler  | node-cron 4                              |
| Security   | Helmet, express-rate-limit, bcryptjs     |
| Logging    | Pino + pino-http                         |
| Testing    | Jest + Supertest + mongodb-memory-server |

### Frontend

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| UI Library | React 19                                      |
| Build Tool | Vite 7                                        |
| Styling    | Tailwind CSS 3                                |
| Routing    | React Router v7                               |
| HTTP       | Axios (with silent token refresh interceptor) |
| Charts     | Recharts 3                                    |
| Testing    | Vitest + Testing Library                      |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- MongoDB 7 (local or Atlas)
- Docker & Docker Compose (for containerised setup)

### Option 1: Docker Compose (Recommended for local)

```bash
# 1. Clone the repository
git clone https://github.com/gupta-akshar/expense-tracker.git
cd expense-tracker

# 2. Create environment file
cp .env.example .env
# Edit .env with your secrets (see Environment Variables section)

# 3. Start all services
docker compose up -d

# 4. Open http://localhost
```

### Option 2: Local Development

```bash
# ── Backend ──────────────────────────────────────────────────────────────────
cd backend
cp .env.example .env          # Fill in MONGO_URI, JWT secrets, etc.
npm install
npm run dev                   # Starts on http://localhost:5000

# ── Frontend (new terminal) ───────────────────────────────────────────────────
cd frontend
cp .env.example .env          # Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                   # Starts on http://localhost:5173
```

---

## 🌐 Production Deployment

The app is deployed with:

- **Frontend** → [Vercel](https://vercel.com) (static React SPA)
- **Backend** → [Render](https://render.com) (Node.js web service)
- **Database** → [MongoDB Atlas](https://cloud.mongodb.com) (M0 free cluster)

See **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** for the full step-by-step guide covering:

- MongoDB Atlas cluster setup and network access
- Render backend service configuration
- Vercel frontend deployment and SPA routing
- Environment variable setup for all environments
- CORS configuration across local, preview, and production
- Post-deployment verification checklist

### Quick Reference: Environment Variables

**Frontend (Vercel)**

| Variable       | Production Value                                  |
| -------------- | ------------------------------------------------- |
| `VITE_API_URL` | `https://expensetracker-backend.onrender.com/api` |

**Backend (Render)**

| Variable             | Description                               |
| -------------------- | ----------------------------------------- |
| `NODE_ENV`           | `production`                              |
| `MONGO_URI`          | MongoDB Atlas connection string           |
| `JWT_ACCESS_SECRET`  | 64-char random secret                     |
| `JWT_REFRESH_SECRET` | Different 64-char random secret           |
| `CLIENT_URL`         | Exact Vercel production origin (no slash) |
| `BCRYPT_ROUNDS`      | `12`                                      |

---

## 🔧 Environment Variables (Local Dev)

### Backend (`backend/.env`)

| Variable                  | Required | Description                       | Example                                    |
| ------------------------- | -------- | --------------------------------- | ------------------------------------------ |
| `MONGO_URI`               | ✅       | MongoDB connection string         | `mongodb://localhost:27017/expensetracker` |
| `JWT_ACCESS_SECRET`       | ✅       | Access token secret (≥ 32 chars)  | `your_32_char_secret_here`                 |
| `JWT_REFRESH_SECRET`      | ✅       | Refresh token secret (≥ 32 chars) | `different_32_char_secret`                 |
| `PORT`                    | ❌       | Server port                       | `5000`                                     |
| `NODE_ENV`                | ❌       | Environment                       | `development` / `production`               |
| `CLIENT_URL`              | ✅       | Frontend origin for CORS          | `http://localhost:5173`                    |
| `BCRYPT_ROUNDS`           | ❌       | bcrypt cost factor (min 10)       | `12`                                       |
| `RATE_LIMIT_LOGIN_MAX`    | ❌       | Max login attempts per 15 min     | `5`                                        |
| `RATE_LIMIT_REGISTER_MAX` | ❌       | Max registrations per hour        | `10`                                       |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (`frontend/.env`)

| Variable       | Required | Description          | Example                     |
| -------------- | -------- | -------------------- | --------------------------- |
| `VITE_API_URL` | ✅       | Backend API base URL | `http://localhost:5000/api` |

---

## 📖 API Documentation

See **[docs/API.md](docs/API.md)** for complete endpoint reference.

**Base URL:** `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <accessToken>`

---

## 🏗 Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for detailed architecture diagrams.

**High-level overview:**

```
Browser
  │
  ├─► React SPA (Vite) — Hosted on Vercel
  │     └─► Axios (silent token refresh)
  │
  └─► Express API — Hosted on Render
        ├─► Mongoose → MongoDB Atlas
        └─► node-cron (recurring jobs)
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test                 # Run all tests
npm test -- --watch     # Watch mode

# Frontend tests
cd frontend
npm test                 # Run in watch mode
npm run test:run         # Run once (CI)
npm run test:coverage    # With coverage report
```

---

## 🗄 Database Migrations

One-time migration scripts (run before deploying schema changes):

```bash
cd backend

# Hash existing refresh tokens (v1.1 upgrade)
npm run migrate:token-hash

# Convert Budget.category from String to ObjectId
npm run migrate:budget-category

# Convert RecurringTransaction.category from String to ObjectId
npm run migrate:recurring-category
```

> ⚠️ Always `mongodump` before running migrations against production data.

---

## 🐳 Docker (Local)

```bash
# Build all images
docker compose build

# Start services (detached)
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop services
docker compose down

# Stop and remove volumes (⚠️ destroys database)
docker compose down -v
```

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── src/
│   │   ├── app.js               # Express app setup
│   │   ├── server.js            # Entry point, graceful shutdown
│   │   ├── config/              # DB, env validation, logger
│   │   ├── controllers/         # Route handlers
│   │   ├── middlewares/         # Auth, validation, error handling
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # Express routers
│   │   ├── services/            # Analytics aggregations
│   │   ├── validators/          # Joi schemas
│   │   ├── jobs/                # Cron jobs
│   │   ├── utils/               # Helpers
│   │   └── migrations/          # One-time DB migrations
│   └── tests/                   # Integration tests
│
├── frontend/
│   ├── vercel.json              # SPA routing + cache headers for Vercel
│   ├── src/
│   │   ├── api/                 # Axios API modules
│   │   ├── components/          # Reusable UI components
│   │   ├── context/             # React context providers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layout/              # App layout
│   │   ├── pages/               # Route page components
│   │   ├── constants/           # App-wide constants
│   │   └── utils/               # Helpers
│   └── public/                  # Static assets
│
├── docs/
│   ├── API.md                   # Full API reference
│   ├── ARCHITECTURE.md          # Architecture diagrams
│   └── DEPLOYMENT_GUIDE.md      # Vercel + Render + Atlas guide
│
├── .github/workflows/           # CI/CD pipelines
├── docker-compose.yml           # Local development stack
├── nginx.proxy.conf             # Nginx reverse proxy config
└── .env.example                 # Root env example (Docker Compose)
```

---

## 🚦 Health Check

```bash
# Public health endpoint
curl https://expensetracker-backend.onrender.com/api/health

# Detailed health (requires HEALTH_SECRET env var)
curl -H "x-health-secret: your_secret" \
  https://expensetracker-backend.onrender.com/api/health/details
```

---

## 🔒 Security

- **JWT access tokens** expire in 15 minutes; stored in-memory (not localStorage)
- **Refresh tokens** are SHA-256 hashed before storage; rotated on each use
- **httpOnly cookies** prevent XSS token theft
- **Rate limiting** on login (5/15min) and register (10/hr) endpoints
- **Helmet** sets security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Joi validation** on all request bodies and query strings
- **bcrypt** with configurable cost factor (default: 12 in production)
- **CORS** restricted to configured CLIENT_URL only

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 🔮 Upcoming Features (V2)

The following features are planned for a future V2 release. They are **not** implemented in the current V1 codebase and are documented here as a roadmap only.

### 💰 Financial Goals & Savings Tracking

Set short-term and long-term financial goals (e.g. "Save ₹50,000 for a laptop by August"). Visual progress bars and milestone notifications keep you on track. Dedicated savings accounts can be linked to specific goal targets.

### 📈 Advanced Analytics & Insights

Year-over-year comparisons, spending velocity charts, category trends over rolling 3/6/12-month windows, and customisable date ranges beyond the current year/month selector. Drill-down from summary to individual transactions in a single click.

### 🤖 AI Spending Insights

LLM-powered analysis of your transaction history to surface anomalies ("You spent 40% more on Food this month"), predict upcoming expenses based on recurring patterns, and suggest personalised budget adjustments.

### 📧 Email Notifications

Weekly and monthly financial summary emails. Budget warning alerts sent when you cross 80% of any category limit. Configurable digest frequency and notification preferences per user.

### 📄 Monthly Financial Reports (PDF)

Auto-generated PDF reports at month-end with income/expense breakdown, category charts, budget performance, and net savings rate. Downloadable on demand or emailed automatically.

### 📥 CSV / Bank Statement Import

Bulk-import transactions from CSV files exported by major Indian banks (HDFC, ICICI, SBI, Axis) and UPI apps (GPay, PhonePe, Paytm). Smart category auto-detection based on merchant names and descriptions.

### 🌏 Multi-Currency Support

Track transactions in multiple currencies with real-time exchange rates. Configure a base reporting currency and view all analytics in your home currency. Useful for freelancers with international clients.

### 📱 Progressive Web App (PWA)

Offline support with service workers, installable on mobile home screen, push notifications for budget warnings and recurring transaction confirmations.

### 👥 Shared Budgets / Household Mode

Invite family members or flatmates to a shared workspace. Assign transactions to individuals or mark them as shared. Split expense tracking with automatic settlement calculations.

### 🔗 Bank Account Integration

Direct bank feed integration via open banking APIs (for supported regions) to automatically import transactions without manual entry.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

_Built with ❤️ by Akshar Gupta_
