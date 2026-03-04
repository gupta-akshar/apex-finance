import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteAccount,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/user.validator.js";

const router = express.Router();

router.use(protect);

router.get("/profile", getUserProfile);
router.put("/profile", validate(updateProfileSchema), updateUserProfile);
router.put("/change-password", validate(changePasswordSchema), changePassword);
router.delete("/", deleteAccount);

export default router;
