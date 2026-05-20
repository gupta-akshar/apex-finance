/**
 * backend/src/migrations/budget-category-objectid.js
 *
 * ONE-TIME migration script.
 * Converts Budget.category from String (category name) to ObjectId.
 *
 * WHEN TO RUN
 * -----------
 * Run this ONCE before deploying the updated Budget model and controller.
 * After the migration every Budget.category will be an ObjectId reference
 * pointing to the matching Category document.
 *
 * HOW TO RUN
 * ----------
 *   # from the backend/ directory
 *   node src/migrations/budget-category-objectid.js
 *
 * SAFE TO RE-RUN?
 * ---------------
 * Yes. The script checks each document individually:
 *   - Already an ObjectId   → skipped (counted as already migrated)
 *   - Valid 24-hex string   → treated as already migrated
 *   - Plain name string     → looked up and replaced
 *
 * BACKUP FIRST
 * ------------
 * Always take a mongodump before running any migration against production data.
 *   mongodump --uri="<your MONGO_URI>" --out=./backup-$(date +%Y%m%d)
 *
 * WHAT CAN GO WRONG
 * -----------------
 * 1. A budget references a category name that has been renamed or deleted.
 *    → The script logs it as "unmatched" and leaves the document unchanged.
 *    → You must handle these manually (delete the orphan budget or re-create
 *      the category and re-run).
 *
 * 2. Two categories exist with the same name for the same user.
 *    → The script picks the first match (sorted by createdAt ascending).
 *    → Log line will say "ambiguous" so you can inspect.
 *
 * 3. Network / DB errors mid-run.
 *    → Safe to re-run: already-converted docs are skipped.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ── Load env from backend/.env ────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ── Minimal inline models (avoid importing app-level code) ───────────────────

const categorySchema = new mongoose.Schema({
  name: String,
  type: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: Date,
});
const Category = mongoose.model("Category", categorySchema);

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: mongoose.Schema.Types.Mixed, // Mixed so we can read both types
  limit: Number,
  month: Number,
  year: Number,
});
const Budget = mongoose.model("Budget", budgetSchema);

// ─────────────────────────────────────────────────────────────────────────────

const isObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ||
  (typeof value === "string" && /^[a-f\d]{24}$/i.test(value));

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌  MONGO_URI not set in environment. Aborting.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri);
  console.log("Connected.\n");

  const budgets = await Budget.find({});
  console.log(`Found ${budgets.length} budget document(s) to inspect.\n`);

  let alreadyMigrated = 0;
  let converted = 0;
  let unmatched = 0;
  let ambiguous = 0;
  let errors = 0;

  for (const budget of budgets) {
    const raw = budget.category;

    // ── 1. Already an ObjectId or a 24-hex string → already migrated ─────
    if (isObjectId(raw)) {
      alreadyMigrated++;
      continue;
    }

    // ── 2. Plain string (category name) → look up Category by name + user ─
    if (typeof raw === "string" && raw.trim().length > 0) {
      const matches = await Category.find({
        user: budget.user,
        name: raw.trim(),
      }).sort({ createdAt: 1 });

      if (matches.length === 0) {
        console.warn(
          `  ⚠  UNMATCHED  budget ${budget._id}  ` +
            `user=${budget.user}  category="${raw}"  ` +
            `month=${budget.month}/${budget.year}  — no category found, SKIPPED`,
        );
        unmatched++;
        continue;
      }

      if (matches.length > 1) {
        console.warn(
          `  ⚠  AMBIGUOUS  budget ${budget._id}  ` +
            `user=${budget.user}  category="${raw}"  ` +
            `(${matches.length} matches) — using oldest: ${matches[0]._id}`,
        );
        ambiguous++;
      }

      const targetId = matches[0]._id;

      try {
        await Budget.updateOne(
          { _id: budget._id },
          { $set: { category: targetId } },
        );
        console.log(
          `  ✓  CONVERTED  budget ${budget._id}  ` + `"${raw}" → ${targetId}`,
        );
        converted++;
      } catch (err) {
        console.error(
          `  ✗  ERROR      budget ${budget._id}  ` +
            `could not update: ${err.message}`,
        );
        errors++;
      }
      continue;
    }

    // ── 3. Null / empty / unexpected type ─────────────────────────────────
    console.warn(
      `  ⚠  INVALID    budget ${budget._id}  ` +
        `category value is: ${JSON.stringify(raw)}  — SKIPPED`,
    );
    unmatched++;
  }

  console.log(`
─────────────────────────────────────────
Migration complete
─────────────────────────────────────────
  Already migrated : ${alreadyMigrated}
  Converted        : ${converted}
  Unmatched        : ${unmatched}
  Ambiguous        : ${ambiguous}  (used oldest match)
  Errors           : ${errors}
─────────────────────────────────────────`);

  if (unmatched > 0) {
    console.log(
      "\n⚠  Some budgets could not be matched to a category.\n" +
        "   These budget documents still have a String category.\n" +
        "   Options:\n" +
        "   1. Delete them manually in MongoDB Compass or mongosh.\n" +
        "   2. Re-create the matching category and re-run this script.\n",
    );
  }

  if (errors > 0) {
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exitCode = 1;
  mongoose.disconnect();
});
