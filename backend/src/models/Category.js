import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

categorySchema.index(
  { user: 1, name: 1, type: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    name: "categories_user_name_type_unique",
  },
);

categorySchema.index({ user: 1, type: 1 }, { name: "categories_user_type" });

categorySchema.index({ name: 1 }, { name: "categories_name" });

export default mongoose.model("Category", categorySchema);
