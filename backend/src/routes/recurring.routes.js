import express from "express";
import {
  createRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "../controllers/recurring.controller.js";

import {
  createRecurringSchema,
  updateRecurringSchema,
} from "../validators/recurring.validator.js";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  validate(createRecurringSchema),
  createRecurringTransaction,
);
router.get("/", protect, getRecurringTransactions);
router.put(
  "/:id",
  protect,
  validate(updateRecurringSchema),
  updateRecurringTransaction,
);
router.delete("/:id", protect, deleteRecurringTransaction);

export default router;
