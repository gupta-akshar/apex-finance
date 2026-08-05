import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUERY_TIMEOUT_MS = 10_000;

// ─── Utility ──────────────────────────────────────────────────────────────────

const getMonthDateRange = (month, year) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { startDate, endDate };
};

// ─── 1. Monthly Summary ───────────────────────────────────────────────────────

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
    {
      $project: {
        _id: 1,
        total: { $round: ["$total", 2] },
      },
    },
  ])
    .hint({ user: 1, date: -1 })
    .maxTimeMS(QUERY_TIMEOUT_MS);

  let income = 0;
  let expense = 0;
  result.forEach((item) => {
    if (item._id === "income") income = item.total;
    if (item._id === "expense") expense = item.total;
  });

  return {
    income,
    expense,
    balance: Math.round((income - expense) * 100) / 100,
  };
};

// ─── 2. Category Breakdown ────────────────────────────────────────────────────

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
    const numMonth = Number(month);
    const numYear = Number(year);
    // FIX: validate these are real numbers before building date range
    if (!isFinite(numMonth) || !isFinite(numYear)) {
      return [];
    }
    const { startDate, endDate } = getMonthDateRange(numMonth, numYear);
    matchStage.date = { $gte: startDate, $lte: endDate };
  } else if (year) {
    const numYear = Number(year);
    if (!isFinite(numYear)) return [];
    matchStage.date = {
      $gte: new Date(Date.UTC(numYear, 0, 1)),
      $lte: new Date(Date.UTC(numYear, 11, 31, 23, 59, 59, 999)),
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
      $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true },
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
        total: { $round: ["$total", 2] },
      },
    },
    { $sort: { total: -1 } },
  ])
    .hint({ user: 1, type: 1, date: -1 })
    .maxTimeMS(QUERY_TIMEOUT_MS);
};

// ─── 3. Overview ──────────────────────────────────────────────────────────────

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
    {
      $project: {
        _id: 0,
        totalIncome: { $round: ["$totalIncome", 2] },
        totalExpense: { $round: ["$totalExpense", 2] },
        transactionsCount: 1,
      },
    },
  ]).maxTimeMS(QUERY_TIMEOUT_MS);

  const data = result[0] ?? {
    totalIncome: 0,
    totalExpense: 0,
    transactionsCount: 0,
  };

  return {
    totalIncome: data.totalIncome,
    totalExpense: data.totalExpense,
    balance: Math.round((data.totalIncome - data.totalExpense) * 100) / 100,
    transactionsCount: data.transactionsCount,
  };
};

// ─── 4. Monthly Trend ─────────────────────────────────────────────────────────

export const getMonthlyTrendService = async (userId, year) => {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

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
          // $month in MongoDB is UTC — consistent with our Date.UTC() ranges
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
        total: { $round: ["$total", 2] },
      },
    },
    { $sort: { month: 1, type: 1 } },
  ])
    .hint({ user: 1, date: -1 })
    .maxTimeMS(QUERY_TIMEOUT_MS);
};
