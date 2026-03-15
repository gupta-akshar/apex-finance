import express from "express";
import {
  createRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "../controllers/recurring.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createRecurringTransaction);
router.get("/", protect, getRecurringTransactions);
router.put("/:id", protect, updateRecurringTransaction);
router.delete("/:id", protect, deleteRecurringTransaction);

export default router;
