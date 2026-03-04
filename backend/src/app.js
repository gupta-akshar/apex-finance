import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import userRoutes from "./routes/user.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

//  Security headers
app.use(helmet());

//  Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

//  CORS (IMPORTANT for refresh tokens)
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

//  Body parser
app.use(express.json({ limit: "10kb" }));

//  Cookies
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;
