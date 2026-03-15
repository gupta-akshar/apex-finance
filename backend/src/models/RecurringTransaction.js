import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
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

export default mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema,
);
