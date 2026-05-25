// backend/src/routes/budget.routes.js
import express from "express";
import {
  setBudget,
  getBudgetStatus,
  getBudgets,
  deleteBudget,
} from "../controllers/budget.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/", setBudget);
router.get("/", getBudgets); // list all budgets (optional ?month=&year=)
router.get("/status", getBudgetStatus);
router.delete("/:id", deleteBudget);

export default router;
