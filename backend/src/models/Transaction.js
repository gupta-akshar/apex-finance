import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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

    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
      validate: {
        validator(value) {
          return value <= new Date();
        },
        message: "Date cannot be in the future",
      },
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank"],
      default: "upi",
    },

    sourceRecurringId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction",
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary query: user + date (list / sort by date)
transactionSchema.index({ user: 1, date: -1 });

// Filter by type within a user
transactionSchema.index({ user: 1, type: 1, date: -1 });

// Filter by category within a user
transactionSchema.index({ user: 1, category: 1, date: -1 });

// Combined type + category filter
transactionSchema.index({ user: 1, type: 1, category: 1, date: -1 });

// Amount-based sorting
transactionSchema.index({ user: 1, amount: -1 });

// createdAt-based ordering
transactionSchema.index({ user: 1, createdAt: -1 });

// ── Idempotency index (cron job deduplication) ────────────────────────────────

transactionSchema.index(
  { sourceRecurringId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceRecurringId: { $type: "objectId" } },
    name: "recurring_idempotency_idx",
  },
);

export default mongoose.model("Transaction", transactionSchema);
