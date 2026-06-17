import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, jti: randomBytes(8).toString("hex") },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" },
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, jti: randomBytes(8).toString("hex") },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
};
