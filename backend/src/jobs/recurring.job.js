import cron from "node-cron";
import mongoose from "mongoose";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";

// ─── Distributed lock model ───────────────────────────────────────────────────

const jobLockSchema = new mongoose.Schema({
  job: { type: String, required: true, unique: true },
  lockedAt: { type: Date, required: true, default: Date.now },
  lockedBy: { type: String }, // hostname/pid for debugging
});

jobLockSchema.index({ lockedAt: 1 }, { expireAfterSeconds: 600 });

const JobLock =
  mongoose.models.JobLock || mongoose.model("JobLock", jobLockSchema);

const LOCK_NAME = "recurring_cron";
const LOCK_TTL_MS = 9 * 60 * 1000; // 9 minutes (slightly under the TTL index)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const utcMidnightToday = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

const shouldRunFrequency = (item, today, last) => {
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  switch (item.frequency) {
    case "daily":
      return diffDays >= 1;
    case "weekly":
      return diffDays >= 7;
    case "monthly":
      return (
        today.getUTCFullYear() > last.getUTCFullYear() ||
        (today.getUTCFullYear() === last.getUTCFullYear() &&
          today.getUTCMonth() > last.getUTCMonth())
      );
    case "yearly":
      return today.getUTCFullYear() > last.getUTCFullYear();
    default:
      return false;
  }
};

// ─── Acquire distributed lock ─────────────────────────────────────────────────

const acquireLock = async () => {
  const lockedBy = `${process.env.HOSTNAME || "unknown"}:${process.pid}`;
  const staleThreshold = new Date(Date.now() - LOCK_TTL_MS);

  try {
    // Atomic upsert: only succeeds if the lock doesn't exist OR is stale
    await JobLock.findOneAndUpdate(
      {
        job: LOCK_NAME,
        $or: [
          { lockedAt: { $lt: staleThreshold } }, // stale lock
          { job: { $exists: false } }, // no lock at all (for upsert)
        ],
      },
      { $set: { lockedAt: new Date(), lockedBy } },
      { upsert: true },
    );
    return true;
  } catch (err) {
    // Duplicate key error (E11000) means another instance holds the lock
    if (err.code === 11000) return false;
    // Unexpected error — don't run the job
    console.error("[recurring-job] Lock acquisition error:", err.message);
    return false;
  }
};

const releaseLock = async () => {
  try {
    await JobLock.deleteOne({ job: LOCK_NAME });
  } catch (err) {
    console.warn(
      "[recurring-job] Lock release failed (non-fatal):",
      err.message,
    );
  }
};

// ─── Main job logic ───────────────────────────────────────────────────────────

const BATCH_SIZE = 200; // process at most 200 items per cron tick

const runJob = async () => {
  const acquired = await acquireLock();
  if (!acquired) {
    console.log("[recurring-job] Lock held by another instance — skipping.");
    return;
  }

  console.log("[recurring-job] Starting…");

  const today = utcMidnightToday();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const items = await RecurringTransaction.find({
      isActive: true,
      startDate: { $lte: today },
    })
      .limit(BATCH_SIZE)
      .lean();

    if (items.length === 0) {
      console.log("[recurring-job] No active items to process.");
      return;
    }

    const categoryIds = [...new Set(items.map((i) => String(i.category)))];
    const validCategories = await Category.find({
      _id: { $in: categoryIds },
    })
      .select("_id")
      .lean();
    const validCategorySet = new Set(validCategories.map((c) => String(c._id)));

    // FIX: batch existence check — single query instead of N queries
    const existingTxs = await Transaction.find({
      sourceRecurringId: { $in: items.map((i) => i._id) },
      date: { $gte: today, $lt: tomorrow },
    })
      .select("sourceRecurringId")
      .lean();
    const alreadyPostedIds = new Set(
      existingTxs.map((t) => String(t.sourceRecurringId)),
    );

    const newTransactions = [];
    const bulkOps = [];
    const deactivateIds = [];

    for (const item of items) {
      // ── Check endDate ────────────────────────────────────────────────────
      if (item.endDate) {
        const ed = new Date(item.endDate);
        const endUtc = new Date(
          Date.UTC(
            ed.getUTCFullYear(),
            ed.getUTCMonth(),
            ed.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        );
        if (today > endUtc) {
          deactivateIds.push(item._id);
          skipped++;
          continue;
        }
      }

      // ── Frequency check ──────────────────────────────────────────────────
      const base = item.lastExecuted
        ? new Date(item.lastExecuted)
        : new Date(item.startDate);
      const last = new Date(
        Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
      );

      if (!shouldRunFrequency(item, today, last)) {
        skipped++;
        continue;
      }

      // FIX: skip if category was deleted (prevents orphaned transactions)
      if (!validCategorySet.has(String(item.category))) {
        console.warn(
          `  ⚠ Skipping "${item.title}" — category ${item.category} no longer exists. Deactivating.`,
        );
        deactivateIds.push(item._id);
        skipped++;
        continue;
      }

      // ── Idempotency check (from batch query above, not per-item) ─────────
      if (alreadyPostedIds.has(String(item._id))) {
        bulkOps.push({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { lastExecuted: today } },
          },
        });
        console.log(
          `  ↻ Recovered "${item.title || item._id}" — synced lastExecuted`,
        );
        continue;
      }

      // Queue the new transaction
      newTransactions.push({
        user: item.user,
        type: item.type,
        amount: item.amount,
        category: item.category,
        note: item.note || "",
        date: today,
        paymentMethod: item.paymentMethod || "bank",
        sourceRecurringId: item._id,
      });

      bulkOps.push({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { lastExecuted: today } },
        },
      });
    }

    // ── Deactivate expired/orphaned items ────────────────────────────────
    if (deactivateIds.length > 0) {
      await RecurringTransaction.updateMany(
        { _id: { $in: deactivateIds } },
        { $set: { isActive: false } },
      );
    }

    //    key errors are caught per-document not globally) ──────────────────
    if (newTransactions.length > 0) {
      try {
        const insertResult = await Transaction.insertMany(newTransactions, {
          ordered: false,
        });
        processed = insertResult.length;
        console.log(`  ✓ Inserted ${processed} transactions`);
      } catch (err) {
        // ordered:false: err.insertedDocs contains the ones that succeeded
        const inserted = err.insertedDocs?.length ?? 0;
        const duplicates =
          err.writeErrors?.filter((e) => e.code === 11000).length ?? 0;
        processed = inserted;
        console.log(
          `  ✓ Inserted ${inserted} transactions; ${duplicates} duplicates blocked by index`,
        );
        if (err.writeErrors?.some((e) => e.code !== 11000)) {
          failed = err.writeErrors.filter((e) => e.code !== 11000).length;
          console.error(`  ✗ ${failed} non-duplicate insert errors`);
        }
      }
    }

    // ── Update lastExecuted in bulk ──────────────────────────────────────
    if (bulkOps.length > 0) {
      await RecurringTransaction.bulkWrite(bulkOps, { ordered: false });
    }
  } catch (err) {
    console.error("[recurring-job] Fatal error:", err.message);
  } finally {
    await releaseLock();
    console.log(
      `[recurring-job] Done — processed:${processed} skipped:${skipped} failed:${failed}`,
    );
  }
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const startRecurringJob = () => {
  cron.schedule("0 0 * * *", runJob);
  console.log("[recurring-job] Scheduled for midnight UTC daily.");
};
