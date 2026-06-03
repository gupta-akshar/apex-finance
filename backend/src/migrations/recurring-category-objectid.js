import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ── Resolve .env relative to this file's location ────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ─── Inline minimal models ────────────────────────────────────────────────────

const categorySchema = new mongoose.Schema({
  name: String,
  type: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: Date,
});
const Category = mongoose.model("Category", categorySchema);

// Mixed category field — lets us read whatever is stored without casting
const recurringSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: mongoose.Schema.Types.Mixed,
  title: String,
});
const Recurring = mongoose.model(
  "RecurringTransaction",
  recurringSchema,
  "recurringtransactions", // explicit collection name — matches Mongoose default
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ||
  (typeof value === "string" && /^[a-f\d]{24}$/i.test(value));

const label = (doc) =>
  `recurring ${doc._id}${doc.title ? ` ("${doc.title}")` : ""}  user=${doc.user}`;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    // Hard exit — there is nothing sensible to do without a connection string.
    console.error(
      "❌  MONGO_URI is not set in the environment. " +
        "Copy .env.example to .env and fill in the value before running this script.",
    );
    process.exit(1);
  }

  // ── Connect ──────────────────────────────────────────────────────────────
  console.log("Connecting to MongoDB…");
  try {
    await mongoose.connect(uri);
  } catch (connErr) {
    console.error("❌  Connection failed:", connErr.message);
    process.exit(1);
  }
  console.log("Connected.\n");

  // ── Load all recurring documents ─────────────────────────────────────────
  let docs;
  try {
    docs = await Recurring.find({}).lean();
  } catch (fetchErr) {
    console.error(
      "❌  Failed to fetch RecurringTransaction documents:",
      fetchErr.message,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(
    `Found ${docs.length} RecurringTransaction document(s) to inspect.\n`,
  );

  // ── Counters ──────────────────────────────────────────────────────────────
  let alreadyMigrated = 0;
  let converted = 0;
  let unmatched = 0;
  let ambiguous = 0;
  let invalid = 0;
  let errors = 0;

  // ── Process each document ─────────────────────────────────────────────────
  for (const doc of docs) {
    const raw = doc.category;

    // ── 1. Already a valid ObjectId or 24-hex string → already migrated ───
    if (isObjectId(raw)) {
      alreadyMigrated++;
      continue;
    }

    // ── 2. Non-empty plain string → look up Category by name + user ────────
    if (typeof raw === "string" && raw.trim().length > 0) {
      const trimmed = raw.trim();

      let matches;
      try {
        matches = await Category.find({ user: doc.user, name: trimmed })
          .sort({ createdAt: 1 }) // oldest first — deterministic choice
          .lean();
      } catch (lookupErr) {
        console.error(
          `  ✗  LOOKUP-ERROR  ${label(doc)}  ` +
            `category="${trimmed}"  error: ${lookupErr.message}`,
        );
        errors++;
        continue;
      }

      // ── 2a. No matching category ─────────────────────────────────────────
      if (matches.length === 0) {
        console.warn(
          `  ⚠  UNMATCHED    ${label(doc)}  ` +
            `category="${trimmed}"  — no Category document found, SKIPPED`,
        );
        unmatched++;
        continue;
      }

      // ── 2b. Multiple categories with the same name for this user ─────────
      if (matches.length > 1) {
        console.warn(
          `  ⚠  AMBIGUOUS    ${label(doc)}  ` +
            `category="${trimmed}"  (${matches.length} matches)  ` +
            `— using oldest: ${matches[0]._id}`,
        );
        ambiguous++;
      }

      const targetId = matches[0]._id;

      // ── 2c. Write the ObjectId back to the document ──────────────────────
      try {
        await Recurring.updateOne(
          { _id: doc._id },
          { $set: { category: targetId } },
        );

        console.log(
          `  ✓  CONVERTED    ${label(doc)}  ` + `"${trimmed}" → ${targetId}`,
        );
        converted++;
      } catch (writeErr) {
        console.error(
          `  ✗  WRITE-ERROR  ${label(doc)}  ` +
            `could not update: ${writeErr.message}`,
        );
        errors++;
      }

      continue;
    }

    // ── 3. Null / empty / unexpected type ────────────────────────────────────
    console.warn(
      `  ⚠  INVALID      ${label(doc)}  ` +
        `category value is ${JSON.stringify(raw)}  — SKIPPED (manual fix required)`,
    );
    invalid++;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
─────────────────────────────────────────────────────────
Migration complete — RecurringTransaction.category
─────────────────────────────────────────────────────────
  Already migrated  : ${alreadyMigrated}
  Converted         : ${converted}
  Ambiguous         : ${ambiguous}  (used oldest match — verify log lines above)
  Unmatched         : ${unmatched}  (document left unchanged — manual fix required)
  Invalid value     : ${invalid}   (null / empty / unexpected type)
  Write / DB errors : ${errors}
─────────────────────────────────────────────────────────`);

  if (unmatched > 0) {
    console.log(
      "\n⚠  Some recurring transactions could not be matched to a Category.\n" +
        "   These documents still carry a plain-text category value.\n" +
        "   Options:\n" +
        "   1. Delete the orphaned recurring transaction in MongoDB Compass.\n" +
        "   2. Re-create the missing category for the relevant user, then\n" +
        "      re-run this script — it will pick up where it left off.\n",
    );
  }

  if (invalid > 0) {
    console.log(
      "⚠  Some recurring transactions have a null, empty, or unexpected\n" +
        "   category value. Inspect the INVALID log lines above and fix\n" +
        "   them manually before deploying the updated schema.\n",
    );
  }

  if (errors > 0) {
    console.log(
      "✗  One or more documents could not be written. Check the\n" +
        "   WRITE-ERROR / LOOKUP-ERROR lines above. The script is safe\n" +
        "   to re-run after the underlying issue is resolved.\n",
    );
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

migrate().catch((fatalErr) => {
  console.error("\n❌  Fatal unhandled error:", fatalErr);
  process.exitCode = 1;
  mongoose.disconnect();
});
