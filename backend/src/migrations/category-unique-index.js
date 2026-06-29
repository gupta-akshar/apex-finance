import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ── Resolve .env relative to this file's location ────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const categorySchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    // Include createdAt so we can recommend keeping the oldest document.
    timestamps: true,
  },
);

const Category = mongoose.model("Category", categorySchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (id) => `<${id}>`;

const pad = (str, width) => String(str).padEnd(width, " ");

// ── Main ──────────────────────────────────────────────────────────────────────

async function migrate() {
  // ── Guard: MONGO_URI must be present ─────────────────────────────────────
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(
      "❌  MONGO_URI is not set in the environment.\n" +
        "    Copy .env.example to .env and fill in the value before running " +
        "this script.",
    );
    process.exit(1); // hard exit — nothing to disconnect
  }

  // ── Connect ───────────────────────────────────────────────────────────────
  console.log("Connecting to MongoDB…");
  try {
    await mongoose.connect(uri);
  } catch (connErr) {
    console.error("❌  Connection failed:", connErr.message);
    process.exit(1);
  }
  console.log("Connected.\n");

  let duplicateGroups;
  try {
    duplicateGroups = await Category.aggregate([
      {
        $group: {
          _id: {
            user: "$user",
            name: "$name",
            type: "$type",
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          // Track the oldest document so the report can suggest which to keep.
          oldestCreatedAt: { $min: "$createdAt" },
        },
      },
      {
        // Only groups with more than one document are duplicates.
        $match: { count: { $gt: 1 } },
      },
      {
        $sort: { count: -1 },
      },
    ]);
  } catch (aggErr) {
    console.error("❌  Aggregation failed:", aggErr.message);
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  const totalDocuments = await Category.countDocuments();
  const duplicateGroupCount = duplicateGroups.length;
  const duplicateDocumentCount = duplicateGroups.reduce(
    (sum, g) => sum + g.count,
    0,
  );
  // Extra documents = total in duplicate groups minus one keeper per group.
  const extraDocumentCount = duplicateGroups.reduce(
    (sum, g) => sum + (g.count - 1),
    0,
  );

  // ── Print summary ─────────────────────────────────────────────────────────
  console.log(
    "─────────────────────────────────────────────────────────────────────",
  );
  console.log("Category unique-index safety check");
  console.log(
    "─────────────────────────────────────────────────────────────────────",
  );
  console.log(`  Total Category documents   : ${totalDocuments}`);
  console.log(`  Duplicate groups found     : ${duplicateGroupCount}`);
  console.log(`  Documents in those groups  : ${duplicateDocumentCount}`);
  console.log(`  Documents to remove        : ${extraDocumentCount}`);
  console.log(
    "─────────────────────────────────────────────────────────────────────",
  );

  // ── Clean exit ────────────────────────────────────────────────────────────
  if (duplicateGroupCount === 0) {
    console.log(
      "\n✓  No duplicates found — safe to create the unique compound index.\n",
    );
    await mongoose.disconnect();
    return; // exitCode stays 0
  }

  // ── Report each duplicate group ───────────────────────────────────────────
  console.log(
    "\n⚠  Duplicates detected.  Resolve each group before creating the index.\n",
  );

  duplicateGroups.forEach((group, idx) => {
    const { user, name, type } = group._id;
    const groupNum = String(idx + 1).padStart(3, "0");

    console.log(`  GROUP ${groupNum}  ──────────────────────────────────────`);
    console.log(`    ${pad("user", 8)}: ${fmt(user)}`);
    console.log(`    ${pad("name", 8)}: "${name}"`);
    console.log(`    ${pad("type", 8)}: ${type}`);
    console.log(`    ${pad("count", 8)}: ${group.count}`);
    console.log();

    group.ids.forEach((id, i) => {
      const tag =
        i === 0 ? "← suggested keep (oldest)" : "← candidate for deletion";
      console.log(`    id[${i}]  ${fmt(id)}  ${tag}`);
    });

    console.log();
  });

  // ── Resolution guidance ───────────────────────────────────────────────────
  console.log(
    "─────────────────────────────────────────────────────────────────────",
  );
  console.log("HOW TO RESOLVE");
  console.log(
    "─────────────────────────────────────────────────────────────────────",
  );
  console.log(
    "  For each group, decide which document to keep, then delete the rest.",
  );
  console.log("  Example using mongosh:");
  console.log();
  console.log(
    '    db.categories.deleteOne({ _id: ObjectId("<id-to-remove>") })',
  );
  console.log();
  console.log(
    "  Re-run this script after each batch of deletions to track progress.",
  );
  console.log(
    "  Only proceed with index creation when this script exits with code 0.",
  );
  console.log(
    "─────────────────────────────────────────────────────────────────────\n",
  );

  process.exitCode = 1;

  await mongoose.disconnect();
}

// ── Entry point ───────────────────────────────────────────────────────────────
migrate().catch((fatalErr) => {
  console.error("\n❌  Fatal unhandled error:", fatalErr);
  process.exitCode = 1;
  mongoose.disconnect();
});
