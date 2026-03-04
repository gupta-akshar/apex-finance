import express from "express";
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

// Register
router.post("/register", validate(registerSchema), registerUser);

// Login
router.post("/login", validate(loginSchema), login);

// Refresh token
router.post("/refresh", refreshAccessToken);

// Logout
router.post("/logout", logout);

// Get current user
router.get("/me", protect, getMe);

export default router;
