import app from "./app.js";
import { loadEnv } from "./config/env.js";
import { validateEnv } from "./config/validateEnv.js";
import { connectDB } from "./config/db.js";
import { startRecurringJob } from "./jobs/recurring.job.js";
import mongoose from "mongoose";

loadEnv();
validateEnv();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    startRecurringJob();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n${signal} received — starting graceful shutdown…`);

      // 1. Stop accepting new connections
      server.close(async (err) => {
        if (err) {
          console.error("Error closing HTTP server:", err.message);
          process.exitCode = 1;
        } else {
          console.log("HTTP server closed.");
        }

        // 2. Close Mongoose connection
        try {
          await mongoose.connection.close();
          console.log("MongoDB connection closed.");
        } catch (mongoErr) {
          console.error("Error closing MongoDB connection:", mongoErr.message);
          process.exitCode = 1;
        }

        console.log("Shutdown complete.");
        process.exit(process.exitCode ?? 0);
      });

      // Safety net: force-exit after 10 s if something hangs
      setTimeout(() => {
        console.error("Forced exit after timeout.");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
