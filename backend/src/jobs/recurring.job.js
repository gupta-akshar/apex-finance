import cron from "node-cron";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

let isRunning = false;

export const startRecurringJob = () => {
  cron.schedule("0 0 * * *", async () => {
    if (isRunning) {
      console.warn(
        "[recurring-job] Previous run still in progress — skipping tick.",
      );
      return;
    }

    isRunning = true;
    console.log("[recurring-job] Starting…");

    const _now = new Date();
    const today = new Date(
      Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate()),
    );
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    let processed = 0,
      skipped = 0,
      recovered = 0,
      failed = 0;
    const bulkOps = [];

    let cursor;
    try {
      cursor = RecurringTransaction.find({
        isActive: true,
        startDate: { $lte: today },
      })
        .sort({ _id: 1 })
        .cursor();
    } catch (fetchErr) {
      console.error("[recurring-job] Failed to open cursor:", fetchErr.message);
      isRunning = false;
      return;
    }

    try {
      for await (const item of cursor) {
        try {
          // ── Respect endDate ──────────────────────────────────────────────
          if (item.endDate) {
            const ed = new Date(item.endDate);
            const end = new Date(
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
            if (today > end) {
              bulkOps.push({
                updateOne: {
                  filter: { _id: item._id },
                  update: { $set: { isActive: false } },
                },
              });
              skipped++;
              continue;
            }
          }

          // ── Is this rule due today? ──────────────────────────────────────
          const base = item.lastExecuted
            ? new Date(item.lastExecuted)
            : new Date(item.startDate);
          const last = new Date(
            Date.UTC(
              base.getUTCFullYear(),
              base.getUTCMonth(),
              base.getUTCDate(),
            ),
          );
          const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

          let shouldRun = false;
          switch (item.frequency) {
            case "daily":
              shouldRun = diffDays >= 1;
              break;
            case "weekly":
              shouldRun = diffDays >= 7;
              break;
            case "monthly":
              shouldRun =
                today.getUTCFullYear() > last.getUTCFullYear() ||
                (today.getUTCFullYear() === last.getUTCFullYear() &&
                  today.getUTCMonth() > last.getUTCMonth());
              break;
            case "yearly":
              shouldRun = today.getUTCFullYear() > last.getUTCFullYear();
              break;
            default:
              shouldRun = false;
          }

          if (!shouldRun) {
            skipped++;
            continue;
          }

          // ── Idempotency check ────────────────────────────────────────────
          const existingTx = await Transaction.exists({
            sourceRecurringId: item._id,
            date: { $gte: today, $lt: tomorrow },
          });

          if (existingTx) {
            bulkOps.push({
              updateOne: {
                filter: { _id: item._id },
                update: { $set: { lastExecuted: today } },
              },
            });
            recovered++;
            console.log(
              `  ↻ Recovered "${item.title || item._id}" — tx existed, synced lastExecuted`,
            );
            continue;
          }

          // ── Create transaction ───────────────────────────────────────────

          await Transaction.create({
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
          processed++;
          console.log(
            `  ✓ Posted "${item.title || item._id}" for user ${item.user}`,
          );
        } catch (err) {
          if (err.code === 11000) {
            bulkOps.push({
              updateOne: {
                filter: { _id: item._id },
                update: { $set: { lastExecuted: today } },
              },
            });
            recovered++;
            console.log(
              `  ↻ Duplicate blocked (unique index) for "${item.title || item._id}"`,
            );
            continue;
          }
          failed++;
          console.error(
            `  ✗ Error on ${item._id} "${item.title || ""}": ${err.message}`,
          );
        }
      }
    } finally {
      try {
        await cursor.close();
      } catch (closeErr) {
        console.error(
          "[recurring-job] cursor.close() failed (non-fatal):",
          closeErr.message,
        );
      }

      if (bulkOps.length > 0) {
        try {
          await RecurringTransaction.bulkWrite(bulkOps, { ordered: false });
        } catch (bulkErr) {
          console.error(
            `[recurring-job] bulkWrite failed (${bulkOps.length} ops):`,
            bulkErr.message,
          );
        }
      }

      // GUARANTEED to run regardless of what threw above.
      isRunning = false;
      console.log(
        `[recurring-job] Done — processed:${processed} skipped:${skipped} recovered:${recovered} failed:${failed}`,
      );
    }
  });
};
