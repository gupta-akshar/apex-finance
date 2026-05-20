// backend/src/controllers/budgetController.js
import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Coerce a value to a Mongoose ObjectId.
 * Returns null if the value is not a valid 24-hex ObjectId string.
 */
const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (mongoose.Types.ObjectId.isValid(String(value))) {
    return new mongoose.Types.ObjectId(String(value));
  }
  return null;
};

// ─── CREATE OR UPDATE BUDGET ──────────────────────────────────────────────────
// POST /api/budgets
// Body: { category: <ObjectId string>, limit, month, year }
export const setBudget = async (req, res, next) => {
  try {
    const { category, limit, month, year } = req.body;

    if (!category || !limit || !month || !year) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // ── Validate category is a real ObjectId ──────────────────────────────
    const categoryId = toObjectId(category);
    if (!categoryId) {
      return res
        .status(400)
        .json({ message: "category must be a valid Category ObjectId" });
    }

    // ── Confirm the category belongs to this user ─────────────────────────
    // This prevents users from setting budgets against other users' categories
    const categoryDoc = await Category.findOne({
      _id: categoryId,
      user: req.user._id,
    });

    if (!categoryDoc) {
      return res
        .status(404)
        .json({ message: "Category not found or does not belong to you" });
    }

    // ── Only expense-type categories make sense as budget targets ─────────
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

// ─── GET BUDGET STATUS (progress + percentage) ────────────────────────────────
// GET /api/budgets/status?month=M&year=Y
export const getBudgetStatus = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const numericMonth = Number(month);
    const numericYear = Number(year);

    // ── Fetch all budgets for this user/month/year, populating category name
    const budgets = await Budget.find({
      user: req.user._id,
      month: numericMonth,
      year: numericYear,
    }).populate("category", "name type");

    if (budgets.length === 0) {
      return res.status(200).json([]);
    }

    // ── Build date range for the month ────────────────────────────────────
    const startDate = new Date(numericYear, numericMonth - 1, 1);
    const endDate = new Date(numericYear, numericMonth, 0, 23, 59, 59, 999);

    // ── Collect the category ObjectIds this user has budgeted ─────────────
    const categoryIds = budgets.map((b) => b.category._id);

    // ── Aggregate spending grouped by category ObjectId ───────────────────
    // Both sides are now ObjectId — comparison is exact and correct.
    const expenses = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: "expense",
          category: { $in: categoryIds }, // ObjectId array filter
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$category", // groups by ObjectId
          spent: { $sum: "$amount" },
        },
      },
    ]);

    // ── Build a lookup map: ObjectId string → amount spent ────────────────
    // Both keys are ObjectId.toString() so they match reliably.
    const spentMap = {};
    expenses.forEach((e) => {
      spentMap[e._id.toString()] = e.spent;
    });

    // ── Merge budget limits with spending data ────────────────────────────
    const result = budgets.map((budget) => {
      const categoryKey = budget.category._id.toString();
      const spent = spentMap[categoryKey] ?? 0;
      const remaining = budget.limit - spent;
      const percentage = Number(((spent / budget.limit) * 100).toFixed(2));

      return {
        _id: budget._id,
        category: budget.category._id,
        categoryName: budget.category.name,
        limit: budget.limit,
        spent,
        remaining,
        percentage,
        warning: percentage >= 80,
        exceeded: spent > budget.limit,
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
// DELETE /api/budgets/:id
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

// ─── GET ALL BUDGETS (for management UI) ─────────────────────────────────────
// GET /api/budgets?month=M&year=Y (month/year optional)
export const getBudgets = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const filter = { user: req.user._id };

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const budgets = await Budget.find(filter)
      .populate("category", "name type")
      .sort({ year: -1, month: -1 });

    res.status(200).json(budgets);
  } catch (error) {
    next(error);
  }
};
