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
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    date: {
      type: Date,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank"],
      default: "upi",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Transaction", transactionSchema);
