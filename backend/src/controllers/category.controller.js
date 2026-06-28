import Category from "../models/Category.js";
import Budget from "../models/Budget.js";
import RecurringTransaction from "../models/RecurringTransaction.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES = ["income", "expense"];
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50; // mirrors the frontend maxLength attribute

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

    // ── Type validation ───────────────────────────────────────────────────

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        message: `type must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    // ── Name validation ───────────────────────────────────────────────────

    if (typeof name !== "string") {
      return res.status(400).json({ message: "name must be a string" });
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return res.status(400).json({ message: "name must not be empty" });
    }

    if (trimmedName.length < MIN_NAME_LENGTH) {
      return res.status(400).json({
        message: `name must be at least ${MIN_NAME_LENGTH} characters`,
      });
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        message: `name must not exceed ${MAX_NAME_LENGTH} characters`,
      });
    }

    // ── Persist using the trimmed name, not the raw input ─────────────────
    const category = await Category.create({
      name: trimmedName,
      type,
      user: req.user._id, // always from verified JWT, not req.body
    });

    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: `A ${type} category named "${trimmedName}" already exists`,
      });
    }

    // ── Generic server error — preserves original behaviour ───────────────
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
