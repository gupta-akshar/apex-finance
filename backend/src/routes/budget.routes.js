import express from "express";
import {
  setBudget,
  getBudgetStatus,
  deleteBudget,
} from "../controllers/budgetController.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, setBudget);

router.get("/status", protect, getBudgetStatus);

router.delete("/:id", protect, deleteBudget);

export default router;
