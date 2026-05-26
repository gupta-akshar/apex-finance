import express from "express";
import rateLimit from "express-rate-limit";

import {
  registerUser,
  login,
  getMe,
  refreshAccessToken,
  logout,
} from "../controllers/auth.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";

const router = express.Router();

// ─── Rate limiters ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many accounts created from this IP. Please try again later.",
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Register
router.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  registerUser,
);

// Login
router.post("/login", loginLimiter, validate(loginSchema), login);

// Refresh token
router.post("/refresh", refreshAccessToken);

// Logout
router.post("/logout", logout);

// Get current user
router.get("/me", protect, getMe);

export default router;
