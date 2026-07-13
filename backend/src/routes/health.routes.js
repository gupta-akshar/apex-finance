import express from "express";
import mongoose from "mongoose";
import process from "process";

const router = express.Router();

// ─── DB state labels (Mongoose readyState codes) ──────────────────────────────
const DB_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

router.get("/health", (_req, res) => {
  const readyState = mongoose.connection.readyState;
  const dbStatus = DB_STATES[readyState] ?? "unknown";
  const isHealthy = readyState === 1; // 1 = connected

  // ── Memory (RSS + heap) ────────────────────────────────────────────────────
  const mem = process.memoryUsage();
  const toMB = (bytes) => Math.round(bytes / 1024 / 1024);

  const payload = {
    status: isHealthy ? "ok" : "error",
    uptime: {
      // process.uptime() returns fractional seconds
      seconds: Math.floor(process.uptime()),
      human: formatUptime(process.uptime()),
    },
    db: {
      status: dbStatus,
      readyState,
    },
    memory: {
      rss_mb: toMB(mem.rss), // resident set size (total process RAM)
      heapUsed_mb: toMB(mem.heapUsed), // live JS objects on the V8 heap
      heapTotal_mb: toMB(mem.heapTotal),
    },
    timestamp: new Date().toISOString(),
  };

  // 200 when connected; 503 Service Unavailable when the DB is gone
  return res.status(isHealthy ? 200 : 503).json(payload);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
