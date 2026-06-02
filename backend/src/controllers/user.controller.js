import bcrypt from "bcryptjs";
import User from "../models/User.js";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";

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

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    // ── Assign plain; the pre-save hook hashes it ─────────────────────────
    user.password = newPassword;
    await user.save(); // isModified("password") = true → hook runs

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/users
// @access  Private
export const deleteAccount = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user._id;

    await Transaction.deleteMany({ user: userId }, { session });
    await Category.deleteMany({ user: userId }, { session });
    await Budget.deleteMany({ user: userId }, { session });
    await RecurringTransaction.deleteMany({ user: userId }, { session });
    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();

    const isProd = process.env.NODE_ENV === "production";

    res
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
      })
      .status(200)
      .json({ message: "Account deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};
