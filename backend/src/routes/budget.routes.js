import express from "express";
import {
  setBudget,
  getBudgetStatus,
  getBudgets,
  deleteBudget,
} from "../controllers/budget.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  setBudgetSchema,
  getBudgetStatusSchema,
  getBudgetsSchema,
} from "../validators/budget.validator.js";

const router = express.Router();

router.use(protect);

router.post("/", validate(setBudgetSchema), setBudget);
router.get("/", validate(getBudgetsSchema, "query"), getBudgets);
router.get(
  "/status",
  validate(getBudgetStatusSchema, "query"),
  getBudgetStatus,
);
router.delete("/:id", deleteBudget);

export default router;
