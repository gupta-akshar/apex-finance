import bcrypt from "bcryptjs";
import User from "../models/User.js";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";

const isProd = process.env.NODE_ENV === "production";

const isTransactionUnsupportedError = (err) =>
  err?.code === 20 ||
  err?.codeName === "IllegalOperation" ||
  (typeof err?.message === "string" &&
    err.message.includes("Transaction numbers are only allowed"));

const deleteUserData = async (userId, session) => {
  const opts = session ? { session } : {};
  await Transaction.deleteMany({ user: userId }, opts);
  await Category.deleteMany({ user: userId }, opts);
  await Budget.deleteMany({ user: userId }, opts);
  await RecurringTransaction.deleteMany({ user: userId }, opts);

  await User.findByIdAndDelete(userId, opts);
};

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, currency } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (currency) user.currency = currency;

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

// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords required" });
    }

    const user = await User.findById(req.user._id).select(
      "+password +refreshToken",
    );

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    user.password = newPassword;
    user.refreshToken = null;
    await user.save();

    res
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
      })
      .status(200)
      .json({ message: "Password updated. Please log in again." });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/users/close-account
// @access  Private

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
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    await deleteUserData(userId, session);
    await session.commitTransaction();
  } catch (txError) {
    await session.abortTransaction();

    if (isTransactionUnsupportedError(txError)) {
      console.warn(
        "[deleteAccount] Falling back to sequential deletes " +
          "(standalone MongoDB detected — no replica set). " +
          "For full atomicity, run MongoDB as a replica set.",
      );

      try {
        await deleteUserData(userId, null);
      } catch (fallbackError) {
        return next(fallbackError);
      }
    } else {
      return next(txError);
    }
  } finally {
    await session.endSession();
  }

  res
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    })
    .status(200)
    .json({ message: "Account deleted successfully" });
};
