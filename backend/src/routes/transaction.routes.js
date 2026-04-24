import express from "express";
import {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transaction.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { transactionSchema } from "../validators/transaction.validator.js";

const router = express.Router();

router.use(protect);

router.post("/", validate(transactionSchema), createTransaction);
router.get("/", getTransactions);
router.put("/:id", validate(transactionSchema), updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
