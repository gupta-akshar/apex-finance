import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

// ─── Utility ──────────────────────────────────────────────────────────────────

const getMonthDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return { startDate, endDate };
};

// ─── 1. Monthly Summary ───────────────────────────────────────────────────────
// Returns income, expense, balance for a single calendar month.

export const getMonthlySummaryService = async (userId, month, year) => {
  const { startDate, endDate } = getMonthDateRange(month, year);

  const result = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let income = 0;
  let expense = 0;

  result.forEach((item) => {
    if (item._id === "income") income = item.total;
    if (item._id === "expense") expense = item.total;
  });

  return { income, expense, balance: income - expense };
};

// ─── 2. Category Breakdown ────────────────────────────────────────────────────
// Returns totals grouped by category NAME (via $lookup).
// Filters by type (required), and optionally by month+year or year alone.

export const getCategoryBreakdownService = async (
  userId,
  type,
  month,
  year,
) => {
  const matchStage = {
    user: new mongoose.Types.ObjectId(userId),
    type,
  };

  if (month && year) {
    const { startDate, endDate } = getMonthDateRange(month, year);
    matchStage.date = { $gte: startDate, $lte: endDate };
  } else if (year) {
    matchStage.date = {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  return await Transaction.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDoc",
      },
    },
    {
      // FIX: was "preserveNullAndEmpty" (unknown option → MongoServerError on
      // MongoDB 5+).  Correct field name is "preserveNullAndEmptyArrays".
      $unwind: {
        path: "$categoryDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          categoryId: "$category",
          categoryName: "$categoryDoc.name",
        },
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        category: { $ifNull: ["$_id.categoryName", "Unknown"] },
        total: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);
};

// ─── 3. Overview ──────────────────────────────────────────────────────────────
// All-time totals across every transaction for this user.

export const getOverviewService = async (userId) => {
  const result = await Transaction.aggregate([
    {
      $match: { user: new mongoose.Types.ObjectId(userId) },
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
        transactionsCount: { $sum: 1 },
      },
    },
  ]);

  const data = result[0] ?? {
    totalIncome: 0,
    totalExpense: 0,
    transactionsCount: 0,
  };

  return {
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    balance: data.totalIncome - data.totalExpense,
    transactionsCount: data.transactionsCount,
  };
};

// ─── 4. Monthly Trend ─────────────────────────────────────────────────────────
// Returns per-month income AND expense totals for every month in the given year.

export const getMonthlyTrendService = async (userId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  return await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$date" },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        type: "$_id.type",
        total: 1,
      },
    },
    { $sort: { month: 1, type: 1 } },
  ]);
};
