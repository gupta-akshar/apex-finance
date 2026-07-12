import logger from "./config/logger.js";
import app from "./app.js";
import { loadEnv } from "./config/env.js";
import { validateEnv } from "./config/validateEnv.js";
import { connectDB } from "./config/db.js";
import { startRecurringJob } from "./jobs/recurring.job.js";
import mongoose from "mongoose";

// ─── Process-level error handlers ────────────────────────────────────────────
// Registered before any async work so that failures during startup (e.g. bad
// env, DB connection refused) are also caught and logged in structured form.
//
// IMPORTANT — these handlers write directly to process.stderr instead of going
// through the pino logger instance.  pino-pretty (and any other async pino
// transport) runs in a worker thread; that thread may not have finished
// initialising when an error fires during synchronous startup, which means
// the transport stream object doesn't exist yet and calling logger.fatal()
// would itself throw ("stream.write is not a function"), masking the original
// error entirely.  process.stderr.write is always synchronous and available.

/**
 * Writes a single newline-terminated JSON object to stderr.
 * Mirrors the pino "fatal" log shape so the output is parseable by the same
 * log shippers / grep patterns used for normal structured logs.
 */
const stderrFatal = (type, err) => {
  const entry = {
    level: 60, // pino numeric level for "fatal"
    time: new Date().toISOString(),
    pid: process.pid,
    type,
    msg: err?.message ?? String(err),
    stack: err?.stack,
  };
  // Use a try/catch so that a broken stderr (e.g. closed pipe) never prevents
  // process.exit from being called on the line below.
  try {
    process.stderr.write(JSON.stringify(entry) + "\n");
  } catch {
    // Nothing left to do — fall through to process.exit.
  }
};

// Synchronous throw that escaped every try/catch.
// The process is in an undefined state — log and exit immediately without
// attempting a graceful shutdown (which could itself throw or hang).
process.on("uncaughtException", (err) => {
  stderrFatal("uncaughtException", err);
  process.exit(1);
});

// Rejected promise with no .catch() handler.
// Node ≥ 15 terminates on unhandled rejections by default; this handler ensures
// the reason is structured-logged before the process exits.
process.on("unhandledRejection", (reason) => {
  // `reason` can be anything — normalise it to an Error for consistent logging.
  const err =
    reason instanceof Error ? reason : new Error(String(reason ?? "unknown"));
  stderrFatal("unhandledRejection", err);
  process.exit(1);
});

// ─── Env ──────────────────────────────────────────────────────────────────────
loadEnv();
validateEnv();

const PORT = process.env.PORT || 5000;

// ─── Startup ─────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    startRecurringJob();

    const server = app.listen(PORT, () => {
      console.log(
        `Server listening on port ${PORT} [${process.env.NODE_ENV || "development"}]`,
      );
    });

    // ── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(
        { signal },
        "Shutdown signal received — draining connections",
      );

      // 1. Stop accepting new connections.
      server.close(async (err) => {
        if (err) {
          logger.error({ err }, "Error while closing HTTP server");
          process.exitCode = 1;
        } else {
          logger.info("HTTP server closed");
        }

        // 2. Close the Mongoose connection pool.
        try {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed");
        } catch (mongoErr) {
          logger.error({ err: mongoErr }, "Error closing MongoDB connection");
          process.exitCode = 1;
        }

        logger.info("Shutdown complete");
        process.exit(process.exitCode ?? 0);
      });

      // Safety net: force-exit after 10 s if draining hangs.
      setTimeout(() => {
        logger.warn("Graceful shutdown timed out — forcing exit");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.fatal({ err: error }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
