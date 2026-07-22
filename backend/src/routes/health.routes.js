import express from "express";
import mongoose from "mongoose";
import process from "process";

const router = express.Router();

const DB_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

// ── Public health check ───────────────────────────────────────────────────────

router.get("/health", (_req, res) => {
  const readyState = mongoose.connection.readyState;
  const isHealthy = readyState === 1;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "error",
    db: DB_STATES[readyState] ?? "unknown",
  });
});

// ── Protected detailed health check ──────────────────────────────────────────

router.get("/health/details", (req, res) => {
  const secret = process.env.HEALTH_SECRET;

  if (!secret) {
    return res.status(404).json({ message: "Not found" });
  }

  if (req.headers["x-health-secret"] !== secret) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const readyState = mongoose.connection.readyState;
  const isHealthy = readyState === 1;
  const mem = process.memoryUsage();
  const toMB = (bytes) => Math.round(bytes / 1024 / 1024);

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "error",
    uptime: {
      seconds: Math.floor(process.uptime()),
      human: formatUptime(process.uptime()),
    },
    db: {
      status: DB_STATES[readyState] ?? "unknown",
      readyState,
    },
    memory: {
      rss_mb: toMB(mem.rss),
      heapUsed_mb: toMB(mem.heapUsed),
      heapTotal_mb: toMB(mem.heapTotal),
    },
    timestamp: new Date().toISOString(),
  });
});

function formatUptime(totalSeconds) {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`]
    .filter(Boolean)
    .join(" ");
}

export default router;
