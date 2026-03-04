import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

// @route   GET /api/analytics/monthly
// @access  Private
export const getMonthlySummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id),
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

    res.status(200).json({
      income,
      expense,
      balance: income - expense,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/categories
// @access  Private
export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({ message: "Transaction type required" });
    }

    const result = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id),
          type,
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    const formatted = result.map((item) => ({
      category: item._id,
      total: item.total,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/analytics/overview
// @access  Private
export const getOverview = async (req, res, next) => {
  try {
    const result = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id),
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

    res.status(200).json({
      totalIncome: data.totalIncome,
      totalExpense: data.totalExpense,
      balance: data.totalIncome - data.totalExpense,
      transactionsCount: data.transactionsCount,
    });
  } catch (error) {
    next(error);
  }
};
