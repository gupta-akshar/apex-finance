import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";

import logger from "./config/logger.js";

import authRoutes from "./routes/auth.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import userRoutes from "./routes/user.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import recurringRoutes from "./routes/recurring.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import healthRoutes from "./routes/health.routes.js";

import { notFound, errorHandler } from "./middlewares/error.middleware.js";

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes.",
  },
});

const app = express();

app.set("etag", false);
app.set("trust proxy", 1);

// ─── Helmet — security headers + CSP ─────────────────────────────────────────
const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
const clientHost = (() => {
  try {
    return new URL(clientOrigin).host;
  } catch {
    return "localhost:5173";
  }
})();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: [
          "'self'",
          `http://${clientHost}`,
          `https://${clientHost}`,
          `ws://${clientHost}`,
          `wss://${clientHost}`,
          "http://localhost:5000",
          "https://localhost:5000",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://fonts.googleapis.com",
        ],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);

// ─── Request logging (pino-http) ──────────────────────────────────────────────

app.use(
  pinoHttp({
    logger,

    // ── Correlation ID ───────────────────────────────────────────────────────

    genReqId: (req, res) => {
      const forwarded = req.headers["x-request-id"];
      if (forwarded) return forwarded;
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },

    // ── Log level by outcome ─────────────────────────────────────────────────

    customLogLevel: (req, res, err) => {
      if (req.url === "/api/health") return "silent";
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },

    // ── Request serialiser ───────────────────────────────────────────────────

    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          // Omit the full headers object; only surface what aids debugging.
          userAgent: req.headers?.["user-agent"],
          remoteAddress: req.remoteAddress,
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },

    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} → ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} → ${res.statusCode} (${err.message})`,
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Disable caching for all API responses ────────────────────────────────────
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", apiLimiter);
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/categories", categoryRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
