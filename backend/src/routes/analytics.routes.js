import express from "express";
import {
  getMonthlySummary,
  getCategoryBreakdown,
  getOverview,
} from "../controllers/analytics.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/monthly", getMonthlySummary);
router.get("/categories", getCategoryBreakdown);
router.get("/overview", getOverview);

export default router;
