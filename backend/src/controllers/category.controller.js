import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";

// GET all categories — scoped to the authenticated user
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD category — user is injected from the auth token, never from the body
export const addCategory = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    const category = await Category.create({
      name,
      type,
      user: req.user._id, // always from verified JWT, not req.body
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE category — ownership enforced + cascade cleanup
export const deleteCategory = async (req, res) => {
  try {
    // ── 1. Delete the category (ownership enforced by the compound filter) ─
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // ── 2. Cascade: remove orphaned budgets ───────────────────────────────
    const budgetResult = await Budget.deleteMany({
      category: category._id,
      user: req.user._id,
    });

    // ── 3. Cascade: deactivate orphaned recurring transactions ────────────
    const recurringResult = await RecurringTransaction.updateMany(
      {
        category: category._id,
        user: req.user._id,
        isActive: true,
      },
      { $set: { isActive: false } },
    );

    // ── 4. Respond with cascade summary ───────────────────────────────────
    res.json({
      message: "Category deleted",
      cascade: {
        budgetsDeleted: budgetResult.deletedCount,
        recurringDeactivated: recurringResult.modifiedCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
