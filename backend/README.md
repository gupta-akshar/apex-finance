# ExpenseTracker — Backend

Express + MongoDB REST API that powers the ExpenseTracker frontend.

---

## Tech stack

| Layer      | Library / Tool                       |
| ---------- | ------------------------------------ |
| Runtime    | Node.js ≥ 20                         |
| Framework  | Express 5                            |
| Database   | MongoDB via Mongoose 9               |
| Auth       | JWT (access + refresh)               |
| Validation | Joi 18                               |
| Scheduler  | node-cron 4                          |
| Security   | Helmet, express-rate-limit, bcryptjs |

---

## Prerequisites

- Node.js 20 or later
- MongoDB 7 instance (local or Atlas)
- `.env` file in `backend/` (see below)

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

```
# MongoDB connection string
MONGO_URI=mongodb://localhost:27017/expensetracker

# JWT secrets — use long random strings (32+ chars)
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Server
PORT=5000
NODE_ENV=development

# Frontend origin for CORS
CLIENT_URL=http://localhost:5173
```

---

## Running the server

```bash
# Install dependencies
npm install

# Development (hot-reload via nodemon)
npm run dev

# Production
node src/server.js
```

---

## API overview

All routes are prefixed with `/api`.  
Protected routes require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`

| Method | Path        | Auth | Description                                  |
| ------ | ----------- | ---- | -------------------------------------------- |
| POST   | `/register` | —    | Create account + seed categories             |
| POST   | `/login`    | —    | Returns access + refresh token               |
| POST   | `/refresh`  | —    | Exchange refresh cookie for new access token |
| POST   | `/logout`   | —    | Invalidates refresh token                    |
| GET    | `/me`       | ✓    | Returns current user                         |

### Transactions — `/api/transactions`

| Method | Path   | Auth | Description                          |
| ------ | ------ | ---- | ------------------------------------ |
| GET    | `/`    | ✓    | Paginated list with filters & search |
| POST   | `/`    | ✓    | Create transaction                   |
| PUT    | `/:id` | ✓    | Update transaction                   |
| DELETE | `/:id` | ✓    | Delete transaction                   |

Query params for `GET /`: `page`, `limit`, `type`, `category`, `startDate`, `endDate`, `month`, `year`, `search`, `sort`

### Categories — `/api/categories`

| Method | Path   | Auth | Description     |
| ------ | ------ | ---- | --------------- |
| GET    | `/`    | ✓    | List categories |
| POST   | `/`    | ✓    | Add category    |
| DELETE | `/:id` | ✓    | Delete category |

### Analytics — `/api/analytics`

| Method | Path          | Auth | Query params              |
| ------ | ------------- | ---- | ------------------------- |
| GET    | `/overview`   | ✓    | —                         |
| GET    | `/monthly`    | ✓    | `month`, `year`           |
| GET    | `/categories` | ✓    | `type`, `month`?, `year`? |
| GET    | `/trend`      | ✓    | `year`                    |

### Budgets — `/api/budgets`

| Method | Path      | Auth | Description                         |
| ------ | --------- | ---- | ----------------------------------- |
| POST   | `/`       | ✓    | Create or update budget             |
| GET    | `/`       | ✓    | List budgets (`?month=&year=`)      |
| GET    | `/status` | ✓    | Progress vs limit (`?month=&year=`) |
| DELETE | `/:id`    | ✓    | Delete budget                       |

### Recurring — `/api/recurring`

| Method | Path   | Auth | Description                  |
| ------ | ------ | ---- | ---------------------------- |
| GET    | `/`    | ✓    | List recurring rules         |
| POST   | `/`    | ✓    | Create recurring rule        |
| PUT    | `/:id` | ✓    | Edit rule or toggle isActive |
| DELETE | `/:id` | ✓    | Delete rule                  |

### Users — `/api/users`

| Method | Path               | Auth | Description          |
| ------ | ------------------ | ---- | -------------------- |
| GET    | `/profile`         | ✓    | Get profile          |
| PUT    | `/profile`         | ✓    | Update name/currency |
| PUT    | `/change-password` | ✓    | Change password      |
| DELETE | `/`                | ✓    | Delete account       |

---

## Architecture notes

### Auth flow

- **Access token**: 15-minute JWT stored in `localStorage` by the frontend.
- **Refresh token**: 7-day JWT in an `httpOnly` cookie, rotated on each `/refresh` call.
- The Axios interceptor in the frontend silently refreshes the access token on 401 responses.

### Recurring scheduler

A `node-cron` job fires at midnight every day. It is idempotent:

- A sparse unique index on `(sourceRecurringId, date)` prevents duplicate transactions even if the process crashes mid-run or two instances fire concurrently.
- See `src/jobs/recurring.job.js` for the crash-recovery strategy.

### Validation

All request bodies and query strings are validated with Joi schemas before reaching the controllers. Schemas live in `src/validators/`.

---

## Migrations

If upgrading from an earlier version where `Budget.category` stored a plain name string (instead of an ObjectId), run the one-time migration:

```bash
node src/migrations/budget-category-objectid.js
```

Always `mongodump` before running any migration against production data.

---

## Rate limits

| Endpoint    | Window | Max requests |
| ----------- | ------ | ------------ |
| `/register` | 1 hour | 10           |
| `/login`    | 15 min | 5            |
