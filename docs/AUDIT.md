# ExpenseTracker V1 — Final Release Audit

**Date:** 2025-06-07
**Auditor:** Release Audit System
**Version:** 1.0.0

---

## Critical Issues (Fix Before Deploy)

### C-1 — `Categories.jsx`: `setCategories` called on undefined function

**File:** `frontend/src/pages/Categories.jsx`
**Severity:** 🔴 Critical (runtime crash on category delete)
**Root cause:** `handleDeleteConfirm` calls `setCategories()` which is never defined. The component uses `setLocalCategories`.
**Fix:** Replace `setCategories(...)` with `setLocalCategories(...)`. **Included in this release.**

### C-2 — Frontend favicon does not match brand

**File:** `frontend/public/logo.svg`
**Severity:** 🔴 Critical (brand inconsistency)
**Root cause:** The favicon SVG uses bar-chart imagery while login/landing pages use the 💸 emoji with indigo gradient.
**Fix:** Updated `logo.svg` to match the indigo gradient brand. **Included in this release.**

### C-3 — Sidebar logout hardcoded to `/`

**File:** `frontend/src/components/Sidebar.jsx` (original)
**Severity:** 🔴 Critical (navigation break — `useNavigate` called outside Router context if sidebar ever moves)
**Root cause:** `logout()` then `navigate("/")` works but the `useAuth` logout already calls `navigate("/login")`. Double-navigation can cause issues.
**Fix:** Sidebar now delegates logout entirely to `useAuth().logout()`. **Included in this release.**

---

## High Priority Issues (Fix Before Deploy)

### H-1 — No `.dockerignore` files

**Files:** `backend/`, `frontend/`
**Impact:** Docker builds include `node_modules`, `.env`, test files — larger images, security risk.
**Fix:** Added `.dockerignore` to both directories. **Included in this release.**

### H-2 — Layout margin does not respond to sidebar collapse

**File:** `frontend/src/layout/Layout.jsx`
**Impact:** Main content area does not reflow when sidebar is collapsed — content hidden behind sidebar.
**Fix:** Layout now reads sidebar collapse state via localStorage + custom event. **Included in this release.**

### H-3 — No `nginx.conf` for frontend container

**Impact:** Frontend Dockerfile references `nginx.conf` which didn't exist — Docker build would fail.
**Fix:** Added `frontend/nginx.conf` with SPA routing, gzip, and cache headers. **Included in this release.**

### H-4 — docker-compose missing `nginx.proxy.conf`

**Impact:** `docker compose up` fails — nginx container cannot start without the proxy config.
**Fix:** Added `nginx.proxy.conf` at repo root. **Included in this release.**

### H-5 — No production `.env` example for Docker

**Impact:** Developers have no reference for the docker-compose required variables.
**Fix:** Added root-level `.env.example` for docker-compose. **Included in this release.**

---

## Medium Priority Issues (Recommended Before Deploy)

### M-1 — Sidebar has no user identity / logout in desktop view

**File:** `frontend/src/components/Sidebar.jsx` (original)
**Impact:** Users must navigate to profile to log out; no visual confirmation of who is signed in.
**Fix:** Added `UserFooter` component with user name, email (truncated), and sign-out button. **Included in this release.**

### M-2 — Sidebar collapse state not persisted

**File:** `frontend/src/components/Sidebar.jsx` (original)
**Impact:** Sidebar resets to expanded on every page refresh.
**Fix:** Collapse state persisted to `localStorage`. **Included in this release.**

### M-3 — `useAuth` hook has no null guard

**File:** `frontend/src/hooks/useAuth.js`
**Impact:** `useContext(AuthContext)` returns `undefined` silently outside provider.
**Fix (recommended):**

```js
// frontend/src/hooks/useAuth.js
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};
```

### M-4 — `TransactionProvider`: AbortController created but cleanup is unreliable in `addTransaction` / `removeTransaction`

**File:** `frontend/src/context/TransactionProvider.jsx`
**Impact:** If the component unmounts while add/remove is in flight, a `setState` on unmounted component warning fires.
**Fix (recommended):** Pass the existing context `AbortController` signal to the inner `fetchTransactions` call, or guard with `mountedRef`.

### M-5 — `Categories.jsx` imports `getCategories` from `categoryApi` but never uses it directly

**File:** `frontend/src/pages/Categories.jsx` (original)
**Impact:** Dead import — minor bundle bloat, ESLint warning.
**Fix:** Remove the unused import. **Included in this release (fixed file).**

### M-6 — `recurring.job.js` has a stray comment fragment

**File:** `backend/src/jobs/recurring.job.js` line ~193
**Impact:** Cosmetic / confusing.
**Description:** `//    key errors are caught per-document not globally) ──────────────────` is an orphaned comment fragment.
**Fix:** Remove the orphaned comment.

---

## Low Priority / Polish

### L-1 — `TransactionModal.jsx` uses `"Saving..."` (with ASCII dots) instead of `"Saving…"` (ellipsis)

**File:** `frontend/src/components/TransactionModal.jsx`
**Impact:** Minor typography inconsistency.

### L-2 — `Reports.jsx` year dropdown only shows 10 years back; `TransactionFilters.jsx` shows 6

**Impact:** Users with historical data beyond the range cannot filter.
**Recommendation:** Standardize to 10 years across all selectors.

### L-3 — `useFonts.js` uses a module-level `Set` as a cache

**File:** `frontend/src/hooks/useFonts.js`
**Impact:** In React Strict Mode or test environments this is fine, but it is a module-level singleton. No action required for V1.

### L-4 — Health endpoint `/health/details` returns `404` when `HEALTH_SECRET` is not set

**File:** `backend/src/routes/health.routes.js`
**Impact:** This is intentional (security through obscurity) but worth documenting.
**Already documented** in API.md.

### L-5 — `SocialLoginButton` and Google Sign-In are placeholders

**File:** `frontend/src/components/auth/SocialLoginButton.jsx`
**Impact:** Expected for V1 — clicking shows a clear "not configured yet" message.

---

## Deployment Checklist

### Environment

- [ ] `MONGO_URI` set and reachable from backend container
- [ ] `JWT_ACCESS_SECRET` ≥ 32 chars, generated with `crypto.randomBytes(48).toString('hex')`
- [ ] `JWT_REFRESH_SECRET` ≥ 32 chars, different from access secret
- [ ] `CLIENT_URL` matches exact frontend origin (no trailing slash)
- [ ] `VITE_API_URL` matches the `/api` path your users will hit
- [ ] `BCRYPT_ROUNDS` ≥ 12 for production
- [ ] `NODE_ENV=production`
- [ ] `HEALTH_SECRET` set for protected health endpoint

### Database

- [ ] MongoDB is NOT exposed on a public port (internal Docker network only)
- [ ] MongoDB has authentication enabled (`MONGO_INITDB_ROOT_USERNAME/PASSWORD`)
- [ ] Taken a `mongodump` backup before first deploy
- [ ] Ran applicable migrations if upgrading from a prior schema:
  - [ ] `npm run migrate:token-hash`
  - [ ] `npm run migrate:budget-category`
  - [ ] `npm run migrate:recurring-category`

### Docker / Infrastructure

- [ ] `docker compose build` completes without errors on target platform
- [ ] `docker compose up -d` starts all 4 services (mongo, backend, frontend, nginx)
- [ ] `docker compose ps` shows all services as `healthy`
- [ ] Health check passes: `curl http://your-domain/api/health` → `{"status":"ok"}`
- [ ] SPA routing works: direct navigation to `/dashboard` returns the React app (not 404)
- [ ] Refresh token cookie is set as `httpOnly; Secure; SameSite=None` on HTTPS

### Security

- [ ] HTTPS/TLS configured (Certbot/Let's Encrypt or load balancer)
- [ ] `.env` is in `.gitignore` and not committed
- [ ] Rate limiting tested: > 5 login attempts returns 429
- [ ] CORS tested: requests from a different origin are rejected
- [ ] `X-Frame-Options: DENY` header present in responses

### CI/CD

- [ ] GitHub Actions secrets set: `GITHUB_TOKEN` (auto), any deployment secrets
- [ ] Backend CI passes on `main` branch
- [ ] Frontend CI passes on `main` branch
- [ ] Docker images pushed to GHCR successfully

### Functional Smoke Test

- [ ] Register new account → redirected to Dashboard
- [ ] Default categories present (Salary, Food, Transport, etc.)
- [ ] Add income transaction → appears in list
- [ ] Add expense transaction → appears in list
- [ ] Budget warning triggers when expense exceeds limit
- [ ] Recurring transaction appears in list and can be toggled
- [ ] Reports page loads charts with data
- [ ] Page refresh restores session (refresh token flow works)
- [ ] Logout clears session and redirects to home

---

## Scores

### Resume / Portfolio Score: **9.2 / 10**

| Dimension              | Score | Notes                                                                                                          |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| Technical depth        | 10/10 | Distributed locks, atomic token rotation, idempotency indexes, integer cents arithmetic, aggregation pipelines |
| Code quality           | 9/10  | Clean separation of concerns, Joi validation, structured logging, error boundaries                             |
| Security               | 9/10  | SHA-256 token hashing, httpOnly cookies, rate limiting, Helmet CSP, cascade-safe deletes                       |
| Testing                | 8/10  | Integration tests, component tests, hook tests — good coverage of critical paths                               |
| Frontend polish        | 9/10  | Responsive, dark theme, animations, error states, empty states, loading states                                 |
| Documentation          | 10/10 | API reference, architecture diagrams (Mermaid), README with quick start                                        |
| DevOps/deployment      | 9/10  | Multi-stage Docker builds, Compose, GitHub Actions CI/CD, health checks                                        |
| Architecture decisions | 10/10 | All decisions documented with rationale in ARCHITECTURE.md                                                     |

**Why not 10/10:** Social auth is a placeholder; no E2E tests (Playwright/Cypress); no observability beyond pino logs (no Sentry/Datadog integration).

---

### Production Readiness Score: **8.8 / 10**

| Dimension          | Score | Notes                                                                                                           |
| ------------------ | ----- | --------------------------------------------------------------------------------------------------------------- |
| Security hardening | 9/10  | Strong — missing TLS (deploy-time concern), email verification not implemented                                  |
| Reliability        | 9/10  | Graceful shutdown, distributed cron lock, crash-safe tombstone for account deletion                             |
| Observability      | 7/10  | Structured pino logs are excellent; no metrics endpoint, no tracing, no alerting                                |
| Scalability        | 8/10  | Stateless API (tokens in DB, not memory), Mongoose connection pooling; cron is single-instance by design        |
| Data integrity     | 10/10 | UTC-consistent dates, integer cents arithmetic, unique indexes, foreign-key enforcement via findOne checks      |
| Performance        | 9/10  | Compound indexes for all common query patterns, `$facet` for atomic pagination, `maxTimeMS` on all aggregations |
| Deployment         | 9/10  | Docker Compose + CI/CD ready; missing Kubernetes manifests (not needed for V1)                                  |
| Recoverability     | 8/10  | Tombstone pattern, migration scripts, DB healthcheck — missing automated backup strategy                        |

---

## What Makes This Stand Out

1. **Atomic refresh token rotation** — `findOneAndUpdate` with hash comparison prevents token reuse attacks without a race condition. Most tutorials use a simple lookup-then-update.

2. **Distributed cron lock** — MongoDB `JobLock` with TTL index. Zero process-level state means the job is safe under Kubernetes rolling deploys or any multi-instance setup.

3. **Integer cents arithmetic** — Financial values computed in integer cents before converting back to rupees. Prevents the classic `0.1 + 0.2 = 0.30000000000000004` bug in budget overspend calculations.

4. **Tombstone pattern for account deletion** — Writes a `DeletionTombstone` before starting the cascade delete. If the process crashes mid-delete, the tombstone is visible on restart and the cleanup can be completed. No orphaned data, no partial deletes.

5. **`$facet` for atomic pagination** — A single aggregation pipeline returns both the count and the page of results, eliminating the classic TOCTOU race where a new transaction inserted between the count query and the data query causes off-by-one page counts.

6. **Context-exposed `invalidate()`** — Category cache invalidation is a function on the context value, not a module-level singleton. Safe in React Strict Mode, safe across provider remounts, testable in isolation.
