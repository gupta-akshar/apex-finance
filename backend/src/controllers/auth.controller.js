import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import Category from "../models/Category.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const cookieOptions = (isProd) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// ================= REGISTER =================
export const registerUser = async (req, res, next) => {
  const defaultCategories = [
    { name: "Salary", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Food", type: "expense" },
    { name: "Transport", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Bills", type: "expense" },
    { name: "Health", type: "expense" },
  ];

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    await Category.insertMany(
      defaultCategories.map((cat) => ({ ...cat, user: user._id })),
    );

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    const isProd = process.env.NODE_ENV === "production";

    res
      .cookie("refreshToken", refreshToken, cookieOptions(isProd))
      .status(201)
      .json({
        success: true,
        accessToken,
        user: { _id: user._id, name: user.name, email: user.email },
      });
  } catch (error) {
    next(error);
  }
};

// ================= LOGIN =================
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, {
      refreshTokenHash: hashToken(refreshToken),
    });

    const isProd = process.env.NODE_ENV === "production";

    res
      .cookie("refreshToken", refreshToken, cookieOptions(isProd))
      .status(200)
      .json({
        success: true,
        accessToken,
        user: { _id: user._id, name: user.name, email: user.email },
      });
  } catch (error) {
    next(error);
  }
};

// ================= REFRESH TOKEN =================
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Refresh token expired" });
      }
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);
    const newHash = hashToken(newRefreshToken);
    const currentHash = hashToken(refreshToken);

    const user = await User.findOneAndUpdate(
      {
        _id: decoded.id,
        refreshTokenHash: currentHash, // must match to succeed
      },
      { $set: { refreshTokenHash: newHash } },
      { new: true },
    );

    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const isProd = process.env.NODE_ENV === "production";

    res.set("Cache-Control", "no-store");

    res
      .cookie("refreshToken", newRefreshToken, cookieOptions(isProd))
      .status(200)
      .json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

// ================= LOGOUT =================
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const currentHash = hashToken(refreshToken);

      await User.findOneAndUpdate(
        { refreshTokenHash: currentHash },
        { $set: { refreshTokenHash: null } },
      );
    }

    const isProd = process.env.NODE_ENV === "production";

    res
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "strict",
      })
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// ================= GET CURRENT USER =================
export const getMe = async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({ success: true, user: req.user });
};
