import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(String(value))) {
    return new mongoose.Types.ObjectId(String(value));
  }
  return null;
};

// ─── CREATE OR UPDATE BUDGET ──────────────────────────────────────────────────
export const setBudget = async (req, res, next) => {
  try {
    const { category, limit, month, year } = req.body;

    if (!category || !limit || !month || !year) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const categoryId = toObjectId(category);
    if (!categoryId) {
      return res
        .status(400)
        .json({ message: "category must be a valid Category ObjectId" });
    }

    const categoryDoc = await Category.findOne({
      _id: categoryId,
      user: req.user._id,
    });

    if (!categoryDoc) {
      return res
        .status(404)
        .json({ message: "Category not found or does not belong to you" });
    }

    if (categoryDoc.type !== "expense") {
      return res
        .status(400)
        .json({ message: "Budgets can only be set for expense categories" });
    }

    const budget = await Budget.findOneAndUpdate(
      {
        user: req.user._id,
        category: categoryId,
        month: Number(month),
        year: Number(year),
      },
      { limit: Number(limit) },
      { new: true, upsert: true },
    ).populate("category", "name type");

    res.status(200).json(budget);
  } catch (error) {
    next(error);
  }
};

// ─── GET BUDGET STATUS ────────────────────────────────────────────────────────
export const getBudgetStatus = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const numericMonth = Number(month);
    const numericYear = Number(year);

    const budgetDocs = await Budget.aggregate([
      {
        $match: {
          user: req.user._id,
          month: numericMonth,
          year: numericYear,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      {
        $unwind: {
          path: "$categoryDoc",
          preserveNullAndEmptyArrays: false, // auto-excludes orphaned budgets
        },
      },
      {
        $project: {
          _id: 1,
          category: "$categoryDoc._id",
          categoryName: "$categoryDoc.name",
          limit: 1,
          month: 1,
          year: 1,
        },
      },
    ]);

    if (budgetDocs.length === 0) {
      return res.status(200).json([]);
    }

    const startDate = new Date(Date.UTC(numericYear, numericMonth - 1, 1));
    const endDate = new Date(
      Date.UTC(numericYear, numericMonth, 0, 23, 59, 59, 999),
    );

    const categoryIds = budgetDocs.map((b) => b.category);

    const expenses = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: "expense",
          category: { $in: categoryIds },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$category",
          spent: { $sum: "$amount" },
        },
      },
    ]).maxTimeMS(10000);

    const spentMap = {};
    expenses.forEach((e) => {
      spentMap[e._id.toString()] = e.spent;
    });

    const result = budgetDocs.map((budget) => {
      const categoryKey = budget.category.toString();
      const spent = spentMap[categoryKey] ?? 0;

      const spentCents = Math.round(spent * 100);
      const limitCents = Math.round(budget.limit * 100);
      const remainingCents = limitCents - spentCents;
      const percentage = Number(((spentCents / limitCents) * 100).toFixed(2));

      return {
        _id: budget._id,
        category: budget.category,
        categoryName: budget.categoryName,
        limit: budget.limit,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remainingCents) / 100,
        percentage,
        warning: percentage >= 80,
        exceeded: spentCents > limitCents,
        month: budget.month,
        year: budget.year,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE BUDGET ────────────────────────────────────────────────────────────
export const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL BUDGETS ──────────────────────────────────────────────────────────
export const getBudgets = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const filter = { user: req.user._id };

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const budgets = await Budget.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      {
        $unwind: {
          path: "$categoryDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          limit: 1,
          month: 1,
          year: 1,
          createdAt: 1,
          category: {
            _id: "$categoryDoc._id",
            name: "$categoryDoc.name",
            type: "$categoryDoc.type",
          },
        },
      },
      { $sort: { year: -1, month: -1 } },
    ]).maxTimeMS(10000);

    res.status(200).json(budgets);
  } catch (error) {
    next(error);
  }
};
