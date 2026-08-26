# 💸 ExpenseTracker

**A production-grade personal finance dashboard** built with the MERN stack. Track income and expenses, visualise spending patterns with interactive charts, set budgets with smart warnings, and automate recurring transactions — all in one clean, dark-themed interface.

[![Backend CI](https://github.com/YOUR_USERNAME/expense-tracker/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/expense-tracker/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/YOUR_USERNAME/expense-tracker/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/expense-tracker/actions/workflows/frontend-ci.yml)
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

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
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

## 🔧 Environment Variables

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
  ├─► React SPA (Vite)
  │     └─► Axios (silent token refresh)
  │
  └─► nginx (reverse proxy)
        ├─► /api/*  →  Express API
        │               ├─► Mongoose / MongoDB
        │               └─► node-cron (recurring jobs)
        └─► /*      →  Static React build
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

## 🐳 Docker

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
│   │   └── migrations/         # One-time DB migrations
│   └── tests/                   # Integration tests
│
├── frontend/
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
│   └── ARCHITECTURE.md          # Architecture diagrams
│
├── .github/workflows/           # CI/CD pipelines
├── docker-compose.yml
├── nginx.proxy.conf
└── .env.example
```

---

## 🚦 Health Check

```bash
# Public health endpoint
curl http://localhost:5000/api/health

# Detailed health (requires HEALTH_SECRET env var)
curl -H "x-health-secret: your_secret" http://localhost:5000/api/health/details
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

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

_Built with ❤️ by Akshar Gupta_
