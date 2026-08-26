# API Reference

**Base URL:** `http://localhost:5000/api`

All protected routes require the `Authorization: Bearer <accessToken>` header.
Access tokens are valid for **15 minutes**. Use the `/auth/refresh` endpoint to obtain a new one.

---

## Authentication

### POST `/auth/register`

Create a new user account. Seeds 7 default categories.

**Rate limit:** 10 requests per hour per IP

**Request Body:**

```json
{
  "name": "Akshar Gupta",
  "email": "akshar@example.com",
  "password": "securepassword123"
}
```

**Response `201`:**

```json
{
  "success": true,
  "accessToken": "eyJhbGci...",
  "user": {
    "_id": "64abc123",
    "name": "Akshar Gupta",
    "email": "akshar@example.com"
  }
}
```

Sets `refreshToken` httpOnly cookie (7-day expiry).

**Errors:** `400` field validation | `400` email already exists

---

### POST `/auth/login`

**Rate limit:** 5 requests per 15 minutes per IP

**Request Body:**

```json
{
  "email": "akshar@example.com",
  "password": "securepassword123"
}
```

**Response `200`:** Same shape as register.

**Errors:** `401` invalid credentials

---

### POST `/auth/refresh`

Exchange the `refreshToken` cookie for a new access token. Rotates the refresh token on each call.

**Request:** No body. Refresh token read from `refreshToken` httpOnly cookie.

**Response `200`:**

```json
{
  "success": true,
  "accessToken": "eyJhbGci..."
}
```

**Errors:** `401` no/expired token | `403` invalid token

---

### POST `/auth/logout`

Invalidates the current refresh token.

**Response `200`:**

```json
{ "success": true, "message": "Logged out successfully" }
```

---

### GET `/auth/me` 🔒

Returns the currently authenticated user.

**Response `200`:**

```json
{
  "success": true,
  "user": {
    "_id": "64abc123",
    "name": "Akshar Gupta",
    "email": "akshar@example.com",
    "currency": "INR",
    "role": "user",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## Transactions 🔒

### GET `/transactions`

Paginated list with full filtering.

**Query Parameters:**

| Parameter   | Type     | Description                                      |
| ----------- | -------- | ------------------------------------------------ |
| `page`      | number   | Page number (default: 1)                         |
| `limit`     | number   | Items per page (default: 10, max: 100)           |
| `type`      | string   | `income` or `expense`                            |
| `category`  | string   | Category ObjectId                                |
| `search`    | string   | Full-text search on note + category name         |
| `sort`      | string   | `latest` `oldest` `highest` `lowest`             |
| `month`     | number   | 1–12 (mutually exclusive with date range)        |
| `year`      | number   | e.g. 2025                                        |
| `startDate` | ISO date | Range start (mutually exclusive with month/year) |
| `endDate`   | ISO date | Range end                                        |

**Response `200`:**

```json
{
  "transactions": [
    {
      "_id": "64abc123",
      "type": "expense",
      "amount": 1500,
      "category": { "_id": "64cat123", "name": "Food", "type": "expense" },
      "note": "Lunch",
      "date": "2025-04-15T00:00:00.000Z",
      "paymentMethod": "upi"
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "pages": 5,
    "limit": 10
  }
}
```

---

### POST `/transactions`

**Request Body:**

```json
{
  "type": "expense",
  "amount": 1500,
  "category": "64cat123",
  "note": "Lunch",
  "date": "2025-04-15",
  "paymentMethod": "upi"
}
```

| Field           | Required | Constraints                         |
| --------------- | -------- | ----------------------------------- |
| `type`          | ✅       | `income` or `expense`               |
| `amount`        | ✅       | > 0, ≤ 1,000,000,000                |
| `category`      | ✅       | Valid ObjectId, must belong to user |
| `date`          | ✅       | ISO date, cannot be in the future   |
| `note`          | ❌       | Max 200 chars                       |
| `paymentMethod` | ❌       | `cash` `upi` `card` `bank`          |

**Response `201`:**

```json
{
  "transaction": { ... },
  "budgetWarning": false,
  "warningMessage": ""
}
```

When `budgetWarning: true`, the transaction is still created but `warningMessage` contains the overspend amount.

---

### PUT `/transactions/:id`

Update any field of an existing transaction.

**Request Body:** Any subset of the create fields.

**Response `200`:** `{ "transaction": { ... } }`

**Errors:** `404` not found | `403` wrong user

---

### DELETE `/transactions/:id`

**Response `200`:** `{ "message": "Transaction deleted" }`

---

## Categories 🔒

### GET `/categories`

Returns all categories for the authenticated user, sorted by type then name.

**Response `200`:**

```json
[
  {
    "_id": "64cat001",
    "name": "Food",
    "type": "expense",
    "user": "64user1",
    "createdAt": "..."
  },
  {
    "_id": "64cat002",
    "name": "Salary",
    "type": "income",
    "user": "64user1",
    "createdAt": "..."
  }
]
```

---

### POST `/categories`

**Request Body:**

```json
{ "name": "Groceries", "type": "expense" }
```

**Constraints:** name 2–50 chars, unique per user+type (case-insensitive)

**Response `201`:** Created category object.

**Errors:** `409` duplicate name

---

### DELETE `/categories/:id`

Cascade-deletes associated budgets and deactivates associated recurring transactions.

**Response `200`:**

```json
{
  "message": "Category deleted",
  "cascade": {
    "budgetsDeleted": 2,
    "recurringDeactivated": 1
  }
}
```

---

## Analytics 🔒

Rate limited to **30 requests/minute**.

### GET `/analytics/overview`

All-time income, expense, and balance totals.

**Response `200`:**

```json
{
  "totalIncome": 500000,
  "totalExpense": 125000,
  "balance": 375000,
  "transactionsCount": 142
}
```

---

### GET `/analytics/monthly`

**Query:** `month` (1–12, required), `year` (required)

**Response `200`:**

```json
{ "income": 85000, "expense": 12500, "balance": 72500 }
```

---

### GET `/analytics/categories`

**Query:** `type` (required: `income|expense`), `month` (optional), `year` (optional)

**Response `200`:**

```json
[
  { "category": "Food", "total": 8500 },
  { "category": "Transport", "total": 2200 }
]
```

---

### GET `/analytics/trend`

**Query:** `year` (required)

**Response `200`:**

```json
[
  { "month": 1, "type": "income", "total": 85000 },
  { "month": 1, "type": "expense", "total": 12000 }
]
```

---

## Budgets 🔒

### POST `/budgets`

Create or update a budget (upsert by user+category+month+year).

**Request Body:**

```json
{
  "category": "64cat001",
  "limit": 10000,
  "month": 4,
  "year": 2025
}
```

Only `expense` categories are allowed.

**Response `200`:** Budget object with populated category.

---

### GET `/budgets`

**Query:** `month` (optional), `year` (optional)

**Response `200`:** Array of budget objects with category details.

---

### GET `/budgets/status`

Budget progress for a given month.

**Query:** `month` (required), `year` (required)

**Response `200`:**

```json
[
  {
    "_id": "64bud001",
    "category": "64cat001",
    "categoryName": "Food",
    "limit": 10000,
    "spent": 8500,
    "remaining": 1500,
    "percentage": 85.0,
    "warning": true,
    "exceeded": false,
    "month": 4,
    "year": 2025
  }
]
```

`warning: true` when percentage ≥ 80%. `exceeded: true` when spent > limit.

---

### DELETE `/budgets/:id`

**Response `200`:** `{ "message": "Budget deleted successfully" }`

---

## Recurring Transactions 🔒

### GET `/recurring`

Returns all recurring rules for the user.

**Response `200`:** Array of recurring transaction objects with populated category.

---

### POST `/recurring`

**Request Body:**

```json
{
  "title": "Netflix",
  "type": "expense",
  "amount": 649,
  "category": "64cat001",
  "frequency": "monthly",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "note": "Streaming subscription",
  "paymentMethod": "card",
  "isActive": true
}
```

`frequency`: `daily` | `weekly` | `monthly` | `yearly`

**Response `201`:** Created recurring transaction object.

---

### PUT `/recurring/:id`

Update any field, or just toggle active status:

```json
{ "isActive": false }
```

**Response `200`:** Updated recurring transaction.

---

### DELETE `/recurring/:id`

**Response `200`:** `{ "message": "Recurring transaction deleted" }`

---

## Users 🔒

### GET `/users/profile`

**Response `200`:** User object (no password or token fields).

---

### PUT `/users/profile`

**Request Body:**

```json
{ "name": "New Name", "currency": "USD" }
```

`currency` must be a valid 3-letter ISO 4217 code.

**Response `200`:** Updated user fields.

---

### PUT `/users/change-password`

**Request Body:**

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

Invalidates all active refresh tokens.

**Response `200`:** `{ "message": "Password updated. Please log in again." }`

---

### POST `/users/close-account`

Permanently deletes the account and all associated data.

**Request Body:**

```json
{ "currentPassword": "mypassword123" }
```

**Response `200`:** `{ "message": "Account deleted successfully" }`

---

## Health

### GET `/api/health`

Public endpoint for load balancer checks.

**Response `200`:**

```json
{ "status": "ok", "db": "connected" }
```

**Response `503`** if database is disconnected.

---

### GET `/api/health/details`

Detailed metrics. Requires `x-health-secret` header matching `HEALTH_SECRET` env var.

**Response `200`:**

```json
{
  "status": "ok",
  "uptime": { "seconds": 3600, "human": "1h 0m 0s" },
  "db": { "status": "connected", "readyState": 1 },
  "memory": { "rss_mb": 85, "heapUsed_mb": 52, "heapTotal_mb": 70 },
  "timestamp": "2025-04-15T12:00:00.000Z"
}
```

---

## Error Response Format

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "stack": "...only in development..."
}
```

## Common HTTP Status Codes

| Code  | Meaning                                 |
| ----- | --------------------------------------- |
| `200` | OK                                      |
| `201` | Created                                 |
| `400` | Bad Request (validation error)          |
| `401` | Unauthorized (missing/expired token)    |
| `403` | Forbidden (valid token, wrong resource) |
| `404` | Not Found                               |
| `409` | Conflict (duplicate)                    |
| `429` | Too Many Requests                       |
| `500` | Internal Server Error                   |
| `503` | Service Unavailable                     |
