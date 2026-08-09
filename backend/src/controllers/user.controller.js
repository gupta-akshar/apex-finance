import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";

const isProd = process.env.NODE_ENV === "production";

// ─── Deletion tombstone schema ─────────────────────────────────────────────────
const deletionTombstoneSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  requestedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  completedAt: { type: Date },
});

const DeletionTombstone =
  mongoose.models.DeletionTombstone ||
  mongoose.model("DeletionTombstone", deletionTombstoneSchema);

// ─── Sequential delete with tombstone ────────────────────────────────────────

const deleteUserData = async (userId) => {
  await Transaction.deleteMany({ user: userId });
  await Category.deleteMany({ user: userId });
  await Budget.deleteMany({ user: userId });
  await RecurringTransaction.deleteMany({ user: userId });
  await User.findByIdAndDelete(userId);
};

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -refreshTokenHash",
    );
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, currency } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (currency) user.currency = currency.toUpperCase();

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      currency: updatedUser.currency,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords required" });
    }

    const user = await User.findById(req.user._id).select(
      "+password +refreshTokenHash",
    );

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    user.password = newPassword;
    user.refreshTokenHash = null;
    await user.save();

    res
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "strict",
      })
      .status(200)
      .json({ message: "Password updated. Please log in again." });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  const { currentPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({
      message: "currentPassword is required to delete your account",
    });
  }

  let user;
  try {
    user = await User.findById(req.user._id).select("+password");
  } catch (error) {
    return next(error);
  }

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: "Incorrect password" });
  }

  const userId = req.user._id;

  try {
    await DeletionTombstone.findOneAndUpdate(
      { userId },
      {
        $set: { requestedAt: new Date(), status: "pending", completedAt: null },
      },
      { upsert: true },
    );

    await deleteUserData(userId);

    await DeletionTombstone.findOneAndUpdate(
      { userId },
      { $set: { status: "completed", completedAt: new Date() } },
    );
  } catch (error) {
    return next(error);
  }

  res
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "strict",
    })
    .status(200)
    .json({ message: "Account deleted successfully" });
};
