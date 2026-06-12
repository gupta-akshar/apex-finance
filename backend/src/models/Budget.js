// backend/src/models/Budget.js
import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Changed: was String (category name), now ObjectId reference ──────────
    // This aligns with Transaction.category which is also an ObjectId ref.
    // The mismatch (String vs ObjectId) caused all budget aggregations to
    // return 0% because spentMap keys (ObjectId strings) never matched
    // budget.category (plain name strings).
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    limit: {
      type: Number,
      required: true,
    },

    month: {
      type: Number,
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

// Unique constraint: one budget per user/category/month/year combination
budgetSchema.index(
  { user: 1, category: 1, month: 1, year: 1 },
  { unique: true },
);

// ADD: supports getBudgets() queries filtered by user+month+year without category
budgetSchema.index({ user: 1, month: 1, year: 1 });

export default mongoose.model("Budget", budgetSchema);
