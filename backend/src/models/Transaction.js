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
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    date: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
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
  },
  { timestamps: true },
);

//  Compound indexes for performance
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

export default mongoose.model("Transaction", transactionSchema);
