import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/health", (_req, res) => {
  const state = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  if (state === 1 || state === 2) {
    return res.status(200).json({ status: "ok", db: "connected" });
  }
  return res.status(503).json({ status: "error", db: "disconnected" });
});

export default router;
