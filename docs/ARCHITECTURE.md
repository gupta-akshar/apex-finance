# Architecture

ExpenseTracker is a full-stack MERN application with a clear separation between the React SPA frontend and the Express REST API backend, joined by a nginx reverse proxy in production.

---

## System Overview

```mermaid
graph TB
    Browser["🌐 Browser\n(React SPA)"]

    subgraph Docker["Docker Compose Stack"]
        Nginx["nginx\nReverse Proxy\n:80"]
        Frontend["Frontend\nnginx static\n:80"]
        Backend["Backend\nExpress API\n:5000"]
        MongoDB["MongoDB 7\n:27017"]
        Cron["node-cron\nRecurring Job\n(midnight UTC)"]
    end

    Browser -->|"HTTPS"| Nginx
    Nginx -->|"/api/*"| Backend
    Nginx -->|"/*"| Frontend
    Backend -->|"Mongoose"| MongoDB
    Cron -.->|"insertMany"| MongoDB
    Backend --- Cron

    style Docker fill:#18181b,stroke:#27272a,color:#e4e4e7
    style Browser fill:#1e1e2e,stroke:#6366f1,color:#a5b4fc
    style Nginx fill:#1e2e1e,stroke:#4ade80,color:#4ade80
    style Frontend fill:#1e1e2e,stroke:#6366f1,color:#a5b4fc
    style Backend fill:#1e2e1e,stroke:#4ade80,color:#4ade80
    style MongoDB fill:#2e1e1e,stroke:#f87171,color:#f87171
    style Cron fill:#2e2e1e,stroke:#facc15,color:#facc15
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as Express API
    participant DB as MongoDB

    Note over B,DB: Login
    B->>API: POST /auth/login {email, password}
    API->>DB: findOne({email}).select("+password")
    DB-->>API: user document
    API->>API: bcrypt.compare(password, hash)
    API->>API: generateAccessToken(userId)  [15min JWT]
    API->>API: generateRefreshToken(userId) [7d JWT]
    API->>API: SHA-256 hash(refreshToken)
    API->>DB: findByIdAndUpdate(userId, {refreshTokenHash})
    API-->>B: 200 {accessToken} + Set-Cookie: refreshToken (httpOnly)

    Note over B,DB: Authenticated Request
    B->>API: GET /api/transactions\nAuthorization: Bearer <accessToken>
    API->>API: jwt.verify(accessToken)
    API->>DB: User.findById(decoded.id)
    DB-->>API: user (no password/token fields)
    API-->>B: 200 {transactions}

    Note over B,DB: Silent Token Refresh (Axios Interceptor)
    B->>API: GET /api/transactions [accessToken expired → 401]
    API-->>B: 401 Token expired
    B->>API: POST /auth/refresh (cookie: refreshToken)
    API->>API: jwt.verify(refreshToken)
    API->>API: SHA-256 hash(refreshToken) = currentHash
    API->>DB: findOneAndUpdate({_id, refreshTokenHash: currentHash},\n{refreshTokenHash: newHash})
    DB-->>API: updated user (or null if token reused → 403)
    API-->>B: 200 {newAccessToken} + Set-Cookie: newRefreshToken
    B->>API: Retry original request with newAccessToken
    API-->>B: 200 {transactions}

    Note over B,DB: Logout
    B->>API: POST /auth/logout (cookie: refreshToken)
    API->>API: SHA-256 hash(refreshToken)
    API->>DB: findOneAndUpdate({refreshTokenHash}, {refreshTokenHash: null})
    API-->>B: 200 + Clear-Cookie: refreshToken
```

---

## Frontend Architecture

```mermaid
graph TD
    subgraph Providers["Context Providers (App.jsx)"]
        Auth["AuthProvider\n(user, login, logout, loading)"]
        Cat["CategoryProvider\n(categories, invalidate)"]
        Tx["TransactionProvider\n(transactions, filters, CRUD)"]
    end

    subgraph Pages
        LP[LandingPage]
        Login[Login]
        Register[Register]
        Dashboard[Dashboard]
        Transactions[Transactions]
        Categories[Categories]
        Reports[Reports]
        Recurring[Recurring]
    end

    subgraph Hooks
        useAuth
        useCategories
        useTransactions
        useAnalytics
        useDashboardAnalytics
        useRecentTransactions
    end

    subgraph API["API Layer (axios.js)"]
        Interceptor["Request Interceptor\n(attach Bearer token)"]
        RefreshInt["Response Interceptor\n(silent 401 → refresh)"]
        Modules["transactionApi\ncategoryApi\nanalyticsApi\nbudgetApi\nrecurringApi\nuserApi"]
    end

    Auth --> Login
    Auth --> Register
    Cat --> Dashboard
    Cat --> Transactions
    Cat --> Categories
    Tx --> Transactions
    Tx --> Dashboard

    Pages --> Hooks
    Hooks --> API
    API --> Interceptor
    API --> RefreshInt

    style Providers fill:#1a1a2e,stroke:#6366f1,color:#a5b4fc
    style Pages fill:#1e2e1e,stroke:#4ade80,color:#4ade80
    style Hooks fill:#2e1e1e,stroke:#f87171,color:#f87171
    style API fill:#2e2e1e,stroke:#facc15,color:#facc15
```

---

## Backend Architecture

```mermaid
graph LR
    subgraph Request["HTTP Request"]
        R[Incoming Request]
    end

    subgraph Middleware["Middleware Stack"]
        Helmet[Helmet\nSecurity Headers]
        CORS[CORS\nOrigin Check]
        RateLimit[Rate Limiter\n200 req/15min global]
        Logger[pino-http\nStructured Logging]
        BodyParser[express.json\n10kb limit]
        CookieParser[cookie-parser]
    end

    subgraph Routes["Route Layer"]
        AuthR["/auth"]
        TxR["/transactions"]
        CatR["/categories"]
        BudR["/budgets"]
        RecR["/recurring"]
        AnaR["/analytics"]
        UsrR["/users"]
        HlthR["/health"]
    end

    subgraph Auth["Auth Middleware"]
        Protect["protect()\njwt.verify → User.findById"]
    end

    subgraph Validation["Joi Validation"]
        ValMW["validate(schema)\nreq.body or req.query"]
    end

    subgraph Controllers["Controllers"]
        AC[auth.controller]
        TC[transaction.controller]
        CC[category.controller]
        BC[budget.controller]
        RC[recurring.controller]
        AnC[analytics.controller]
        UC[user.controller]
    end

    subgraph Services["Services"]
        AS[analytics.service\n$aggregate pipelines]
    end

    subgraph DB["MongoDB via Mongoose 9"]
        User[User]
        Transaction[Transaction]
        Category[Category]
        Budget[Budget]
        Recurring[RecurringTransaction]
        JobLock[JobLock]
    end

    subgraph ErrorHandling["Error Handling"]
        NotFound[notFound middleware]
        ErrorH[errorHandler middleware]
    end

    R --> Helmet --> CORS --> RateLimit --> Logger --> BodyParser --> CookieParser
    CookieParser --> Routes
    Routes --> Auth --> Validation --> Controllers
    Controllers --> Services --> DB
    Controllers --> DB
    Routes --> ErrorHandling

    style Request fill:#1a1a2e,stroke:#6366f1
    style Middleware fill:#1e2e1e,stroke:#4ade80
    style Routes fill:#2e1a1e,stroke:#f87171
    style Controllers fill:#2e2e1e,stroke:#facc15
    style DB fill:#1a2e2e,stroke:#38bdf8
```

---

## Database Schema

```mermaid
erDiagram
    User {
        ObjectId _id PK
        String name
        String email UK
        String password "select:false"
        String currency "default:INR"
        Boolean isEmailVerified
        String role "user|admin"
        String refreshTokenHash "select:false"
        Date createdAt
        Date updatedAt
    }

    Category {
        ObjectId _id PK
        ObjectId user FK
        String name
        String type "income|expense"
        Date createdAt
    }

    Transaction {
        ObjectId _id PK
        ObjectId user FK
        String type "income|expense"
        Number amount
        ObjectId category FK
        String note
        Date date
        String paymentMethod "cash|upi|card|bank"
        ObjectId sourceRecurringId FK
        Date createdAt
    }

    Budget {
        ObjectId _id PK
        ObjectId user FK
        ObjectId category FK
        Number limit
        Number month "1-12"
        Number year
        Date createdAt
    }

    RecurringTransaction {
        ObjectId _id PK
        ObjectId user FK
        String title
        String type "income|expense"
        Number amount
        ObjectId category FK
        String frequency "daily|weekly|monthly|yearly"
        Date startDate
        Date endDate
        String note
        String paymentMethod
        Date lastExecuted
        Boolean isActive
        Date createdAt
    }

    JobLock {
        ObjectId _id PK
        String job UK
        Date lockedAt "TTL:600s"
        String lockedBy
    }

    DeletionTombstone {
        ObjectId _id PK
        ObjectId userId UK
        Date requestedAt
        String status "pending|completed"
        Date completedAt
    }

    User ||--o{ Category : "owns"
    User ||--o{ Transaction : "logs"
    User ||--o{ Budget : "sets"
    User ||--o{ RecurringTransaction : "schedules"
    Category ||--o{ Transaction : "classifies"
    Category ||--o{ Budget : "tracked by"
    Category ||--o{ RecurringTransaction : "used in"
    RecurringTransaction ||--o{ Transaction : "generates"
```

---

## Recurring Job Flow

```mermaid
flowchart TD
    Start([Cron fires at midnight UTC])
    Lock{Acquire\nMongoDB lock}
    Skip([Log: lock held, skip])
    Fetch[Fetch active recurring\ntransactions startDate ≤ today]
    Empty([Log: nothing to process])
    ValidateCats[Batch-validate categories\nstill exist]
    BatchCheck[Batch-check already\nposted today]

    subgraph PerItem["For each item"]
        CheckEnd{endDate\npassed?}
        CheckFreq{Frequency\ncheck passed?}
        CheckCat{Category\nvalid?}
        CheckIdem{Already posted\ntoday?}
        Queue[Queue new Transaction]
        SyncLastExec[Sync lastExecuted]
        Deactivate[Mark isActive: false]
        SkipItem[Skip item]
    end

    InsertMany["Transaction.insertMany\nordered:false\n(duplicates blocked by\nunique index)"]
    BulkWrite["RecurringTransaction.bulkWrite\n(update lastExecuted)"]
    DeactivateBulk["Deactivate expired/\norphaned items"]
    ReleaseLock[Release MongoDB lock]
    Done([Log summary])

    Start --> Lock
    Lock -- "fail (E11000)" --> Skip
    Lock -- "success" --> Fetch
    Fetch -- "0 items" --> Empty --> ReleaseLock
    Fetch -- "items found" --> ValidateCats --> BatchCheck --> PerItem

    CheckEnd -- "yes" --> Deactivate
    CheckEnd -- "no" --> CheckFreq
    CheckFreq -- "no" --> SkipItem
    CheckFreq -- "yes" --> CheckCat
    CheckCat -- "invalid" --> Deactivate
    CheckCat -- "valid" --> CheckIdem
    CheckIdem -- "yes" --> SyncLastExec
    CheckIdem -- "no" --> Queue

    PerItem --> InsertMany --> BulkWrite --> DeactivateBulk --> ReleaseLock --> Done
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph CI["GitHub Actions CI/CD"]
        Push[git push main]
        BackendCI[Backend CI\ntest + audit + docker build]
        FrontendCI[Frontend CI\nlint + test + docker build]
        Deploy[Build & Push\nDocker images to GHCR]
    end

    subgraph Production["Production Server (VPS / Cloud VM)"]
        Compose[docker compose up -d]

        subgraph Stack["Docker Compose Stack"]
            NginxP["nginx :80\nReverse Proxy"]
            FE["Frontend\nnginx static"]
            BE["Backend\nExpress :5000"]
            Mongo["MongoDB :27017\n(internal only)"]
        end

        MongoVol[(mongo-data\nnamed volume)]
    end

    Push --> BackendCI
    Push --> FrontendCI
    BackendCI --> Deploy
    FrontendCI --> Deploy
    Deploy -->|"pull images + restart"| Compose
    Compose --> Stack
    Mongo --- MongoVol

    style CI fill:#1a1a2e,stroke:#6366f1,color:#a5b4fc
    style Production fill:#1e2e1e,stroke:#4ade80,color:#4ade80
    style Stack fill:#18181b,stroke:#27272a,color:#e4e4e7
```

---

## Key Design Decisions

### Token Security

Refresh tokens are SHA-256 hashed before storage, meaning a database breach does not expose usable tokens. The plaintext token exists only in the httpOnly cookie and in-transit. Rotation on every use means reuse of a stolen token is detected and rejected atomically via `findOneAndUpdate`.

### Distributed Cron Lock

The `JobLock` MongoDB collection with a TTL index prevents duplicate transaction insertion when multiple Node.js processes (horizontal scaling, container restarts) fire the cron simultaneously. The lock is acquired atomically and has a 9-minute TTL — the cron fires daily, so a stale lock from a crashed process auto-expires well before the next run.

### Idempotent Recurring Transactions

A sparse unique index on `(sourceRecurringId, date)` ensures that even if `insertMany` is called twice for the same day (e.g. after a crash mid-job), the database-level constraint prevents duplicates. `ordered: false` allows the batch to continue inserting new items even if some duplicates are rejected.

### Integer Arithmetic for Financial Values

All budget percentage and overspend calculations use integer cents arithmetic (`Math.round(value * 100)`) to avoid floating-point rounding errors that would cause, for example, ₹999.99 + ₹0.01 ≠ ₹1000.00.

### Context vs Module Singleton for Categories

The `CategoryProvider` exposes an `invalidate()` function through React context, replacing the previous module-level singleton cache flag. This is safe across React Strict Mode double-mounts, avoids stale closure bugs, and works correctly when the component tree is partially re-mounted.
