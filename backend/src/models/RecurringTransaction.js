import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

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

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank"],
      default: "bank",
    },

    lastExecuted: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

recurringTransactionSchema.index(
  { isActive: 1, startDate: 1 },
  { name: "recurring_cron_query_idx" },
);

recurringTransactionSchema.index(
  { user: 1, createdAt: -1 },
  { name: "recurring_user_list_idx" },
);

export default mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema,
);
