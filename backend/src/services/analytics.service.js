import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

/**
 * Utility: Get month date range
 */
const getMonthDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return { startDate, endDate };
};

/**
 * 1️⃣ Monthly Summary
 */
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

  return {
    income,
    expense,
    balance: income - expense,
  };
};

/**
 * 2️⃣ Category Breakdown (Filtered by type + optional month/year)
 */
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
  }

  return await Transaction.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        category: "$_id",
        total: 1,
        _id: 0,
      },
    },
    { $sort: { total: -1 } },
  ]);
};

/**
 * 3️⃣ Overview (All-time stats)
 */
export const getOverviewService = async (userId) => {
  const result = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
        transactionsCount: { $sum: 1 },
      },
    },
  ]);

  const data = result[0] || {
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

/**
 * 4️⃣ Monthly Trend (Yearly Expense Trend)
 */
export const getMonthlyTrendService = async (userId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  return await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: "expense",
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { month: { $month: "$date" } },
        totalExpense: { $sum: "$amount" },
      },
    },
    {
      $project: {
        month: "$_id.month",
        totalExpense: 1,
        _id: 0,
      },
    },
    { $sort: { month: 1 } },
  ]);
};
