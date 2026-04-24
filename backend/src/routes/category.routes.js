import express from "express";
import {
  getCategories,
  addCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getCategories);
router.post("/", protect, addCategory);
router.delete("/:id", protect, deleteCategory);

export default router;
