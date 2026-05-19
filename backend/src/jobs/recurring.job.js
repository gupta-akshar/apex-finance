// backend/src/jobs/recurring.job.js
import cron from "node-cron";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

/**
 * ─── IDEMPOTENCY STRATEGY ────────────────────────────────────────────────────
 *
 * Problem
 * -------
 * The original scheduler wrote a Transaction then updated lastExecuted in two
 * separate, non-atomic operations.  A crash between them left the DB in a
 * state where the transaction existed but lastExecuted was stale, causing the
 * next cron run to create a duplicate.
 *
 * Solution
 * --------
 * 1. sourceRecurringId field (added to Transaction model)
 *    Every auto-generated transaction carries the ObjectId of the recurring
 *    rule that produced it.  This is the idempotency key.
 *
 * 2. Sparse unique index on (sourceRecurringId, date)
 *    Enforced at the MongoDB layer.  Two concurrent processes trying to insert
 *    for the same rule on the same day will get one success + one 11000 error.
 *    The error handler syncs lastExecuted and moves on — no duplicate is ever
 *    persisted, regardless of timing.
 *
 * 3. Pre-flight idempotency check (crash recovery)
 *    Before attempting insertion, the job queries for an existing transaction
 *    matching (sourceRecurringId, today).  If one is found it means a previous
 *    run created the transaction but crashed before updating lastExecuted.  We
 *    just sync lastExecuted and skip — zero duplicate risk.
 *
 * Execution order (chosen to prefer "missed" over "duplicated")
 * --------------------------------------------------------------
 *   1.  shouldRun check           — skip if already done this period
 *   2.  Idempotency check         — crash recovery: tx exists → sync, skip
 *   3.  Transaction.create(...)   — unique index is the last line of defence
 *   4.  lastExecuted update       — best-effort after confirmed creation
 *
 * Crash scenarios
 * ---------------
 *   Crash before step 3  → next run re-executes from step 1. Safe.
 *   Crash after step 3, before step 4
 *                        → next run: shouldRun=true (lastExecuted stale),
 *                          step 2 finds existing tx, syncs lastExecuted, skips.
 *                          No duplicate created. ✓
 *   Crash after step 4   → everything committed. Safe.
 *
 * Concurrency (two cron instances fire simultaneously)
 * ----------------------------------------------------
 *   Both pass step 2 (no tx yet) at the same moment.
 *   One wins step 3; the other gets error code 11000.
 *   Error handler on the loser syncs lastExecuted (best-effort) and continues.
 *   No duplicate created. ✓
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const startRecurringJob = () => {
  // Runs every day at midnight  — same schedule as original
  cron.schedule("0 0 * * *", async () => {
    console.log("Running recurring transactions job…");

    // Midnight-normalised today so all date comparisons are day-level
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upper bound for idempotency range query (exclusive)
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    let processed = 0;
    let skipped = 0;
    let recovered = 0;
    let failed = 0;

    // ── Fetch candidates ─────────────────────────────────────────────────────
    let recurringList;
    try {
      recurringList = await RecurringTransaction.find({
        isActive: true,
        startDate: { $lte: today },
      });
    } catch (fetchErr) {
      console.error("Recurring job: failed to fetch rules:", fetchErr.message);
      return; // abort this cron tick cleanly; next midnight will retry
    }

    // ── Process each rule ────────────────────────────────────────────────────
    for (const item of recurringList) {
      try {
        // ── Respect endDate ────────────────────────────────────────────────
        if (item.endDate) {
          const end = new Date(item.endDate);
          end.setHours(23, 59, 59, 999);
          if (today > end) {
            item.isActive = false;
            await item.save();
            skipped++;
            continue;
          }
        }

        // ── Determine whether this rule is due today ───────────────────────
        const last = item.lastExecuted
          ? new Date(item.lastExecuted)
          : new Date(item.startDate);

        last.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

        let shouldRun = false;

        switch (item.frequency) {
          case "daily":
            shouldRun = diffDays >= 1;
            break;

          case "weekly":
            shouldRun = diffDays >= 7;
            break;

          case "monthly": {
            const lastMonth = last.getMonth();
            const lastYear = last.getFullYear();
            const todayMonth = today.getMonth();
            const todayYear = today.getFullYear();
            shouldRun =
              todayYear > lastYear ||
              (todayYear === lastYear && todayMonth > lastMonth);
            break;
          }

          case "yearly":
            shouldRun = today.getFullYear() > last.getFullYear();
            break;

          default:
            shouldRun = false;
        }

        if (!shouldRun) {
          skipped++;
          continue;
        }

        // ── IDEMPOTENCY CHECK ──────────────────────────────────────────────
        // Handles crash recovery: the previous run may have created the
        // transaction but crashed before updating lastExecuted.
        // Transaction.exists() is a cheap count-only query.
        const existingTx = await Transaction.exists({
          sourceRecurringId: item._id,
          date: { $gte: today, $lt: tomorrow },
        });

        if (existingTx) {
          // Transaction already in place — just sync the pointer and move on.
          await RecurringTransaction.updateOne(
            { _id: item._id },
            { $set: { lastExecuted: today } },
          );
          recovered++;
          console.log(
            `  ↻ Recovered "${item.title || item._id}" — ` +
              `tx existed from previous run, synced lastExecuted`,
          );
          continue;
        }

        // ── CREATE TRANSACTION ─────────────────────────────────────────────
        // sourceRecurringId is the idempotency key.
        // The sparse unique index on (sourceRecurringId, date) is the
        // structural guarantee: if two processes reach this point for the
        // same rule on the same day, only one INSERT will succeed.
        await Transaction.create({
          user: item.user,
          type: item.type,
          amount: item.amount,
          category: item.category,
          note: item.note || "",
          date: today, // always midnight-normalised
          sourceRecurringId: item._id, // idempotency key
        });

        // ── UPDATE lastExecuted ────────────────────────────────────────────
        // If the process crashes here, the idempotency check in the next run
        // will detect the existing transaction and perform this update then.
        await RecurringTransaction.updateOne(
          { _id: item._id },
          { $set: { lastExecuted: today } },
        );

        processed++;
        console.log(
          `  ✓ Posted recurring "${item.title || item._id}" ` +
            `for user ${item.user}`,
        );
      } catch (err) {
        // ── DUPLICATE KEY ──────────────────────────────────────────────────
        // Code 11000 means a concurrent cron instance already inserted the
        // transaction between our idempotency check and our create call.
        // This is NOT a real error — treat it as a successful execution by
        // the other process and sync lastExecuted.
        if (err.code === 11000) {
          await RecurringTransaction.updateOne(
            { _id: item._id },
            { $set: { lastExecuted: today } },
          ).catch((syncErr) => {
            // Sync is best-effort; the next run's idempotency check will
            // catch it if this also fails.
            console.error(
              `  ✗ Could not sync lastExecuted after duplicate for ` +
                `${item._id}: ${syncErr.message}`,
            );
          });

          recovered++;
          console.log(
            `  ↻ Duplicate prevented for "${item.title || item._id}" ` +
              `(concurrent execution — unique index blocked second insert)`,
          );
          continue;
        }

        // Unexpected error — log and continue; one bad rule must not halt
        // the entire job for all other users.
        failed++;
        console.error(
          `  ✗ Error processing recurring item ${item._id} ` +
            `"${item.title || ""}": ${err.message}`,
        );
      }
    }

    console.log(
      `Recurring job complete — ` +
        `processed: ${processed}, skipped: ${skipped}, ` +
        `recovered: ${recovered}, failed: ${failed}`,
    );
  });
};
