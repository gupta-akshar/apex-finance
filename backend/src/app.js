import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
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

// ─── Rate limiters ────────────────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || ipKeyGenerator(req);
  },
  message: {
    success: false,
    message: "Too many requests, please try again after 15 minutes.",
  },
});

const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  message: {
    success: false,
    message: "Too many analytics requests. Please slow down.",
  },
});

const app = express();

app.set("etag", false);
app.set("trust proxy", 1);

// ─── Helmet ───────────────────────────────────────────────────────────────────
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
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
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
        ...(process.env.NODE_ENV === "production"
          ? { upgradeInsecureRequests: [] }
          : {}),
      },
    },
    frameguard: { action: "deny" },
    noSniff: true,
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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Request logging ──────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const forwarded = req.headers["x-request-id"];
      if (forwarded) return forwarded;
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customLogLevel: (req, res, err) => {
      if (req.url === "/api/health") return "silent";
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
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
app.use("/api/analytics", analyticsLimiter, analyticsRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/categories", categoryRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
