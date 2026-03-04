import express from "express";
import {
  getMonthlySummary,
  getCategoryBreakdown,
  getOverview,
  getMonthlyTrend,
} from "../controllers/analytics.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  monthlySchema,
  categoriesSchema,
  trendSchema,
} from "../validators/analytics.validator.js";

const router = express.Router();

// Monthly summary
router.get(
  "/monthly",
  protect,
  validate(monthlySchema, "query"),
  getMonthlySummary,
);

// Category breakdown
router.get(
  "/categories",
  protect,
  validate(categoriesSchema, "query"),
  getCategoryBreakdown,
);

// Overview
router.get("/overview", protect, getOverview);

// Monthly trend
router.get("/trend", protect, validate(trendSchema, "query"), getMonthlyTrend);

export default router;
