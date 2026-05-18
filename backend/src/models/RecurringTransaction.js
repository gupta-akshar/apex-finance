import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Human-readable label (e.g. "Netflix", "Salary") ─────────────────────
    title: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Stored as ObjectId but legacy docs may have a plain String.
    // We use Mixed so the collection stays backward-compatible while new
    // writes always store an ObjectId ref (frontend sends the _id string,
    // Mongoose auto-casts it).
    category: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // ── "yearly" added; keeps backward-compat with existing docs ────────────
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    // ── Optional end date — stop auto-posting after this date ───────────────
    endDate: {
      type: Date,
      default: null,
    },

    // ── Optional memo / description ──────────────────────────────────────────
    note: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    lastExecuted: {
      type: Date,
      default: null,
    },

    // ── Canonical active-state field — "isActive" everywhere ────────────────
    // (was the only correct field in the old schema; keeping it avoids a
    //  migration for the isActive column that already exists in the DB)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema,
);
