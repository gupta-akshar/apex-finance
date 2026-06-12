import cron from "node-cron";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

export const startRecurringJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running recurring transactions job…");

    const _now = new Date();
    const today = new Date(
      Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate()),
    );
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    let processed = 0;
    let skipped = 0;
    let recovered = 0;
    let failed = 0;

    // ── Fetch candidates ─────────────────────────────────────────────────────
    // ── Fetch candidates via cursor (avoids loading all docs into memory) ────────
    let cursor;
    try {
      cursor = RecurringTransaction.find({
        isActive: true,
        startDate: { $lte: today },
      })
        .sort({ _id: 1 })
        .cursor();
    } catch (fetchErr) {
      console.error("Recurring job: failed to open cursor:", fetchErr.message);
      return;
    }

    // ── Process each rule ────────────────────────────────────────────────────────
    try {
      for await (const item of cursor) {
        try {
          // ── Respect endDate ──────────────────────────────────────────────────
          if (item.endDate) {
            const _ed = new Date(item.endDate);
            const end = new Date(
              Date.UTC(
                _ed.getUTCFullYear(),
                _ed.getUTCMonth(),
                _ed.getUTCDate(),
                23,
                59,
                59,
                999,
              ),
            );
            if (today > end) {
              item.isActive = false;
              await item.save();
              skipped++;
              continue;
            }
          }

          // ── Determine whether this rule is due today ─────────────────────────
          const _base = item.lastExecuted
            ? new Date(item.lastExecuted)
            : new Date(item.startDate);
          const last = new Date(
            Date.UTC(
              _base.getUTCFullYear(),
              _base.getUTCMonth(),
              _base.getUTCDate(),
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
            case "monthly": {
              const lastMonth = last.getUTCMonth();
              const lastYear = last.getUTCFullYear();
              const todayMonth = today.getUTCMonth();
              const todayYear = today.getUTCFullYear();
              shouldRun =
                todayYear > lastYear ||
                (todayYear === lastYear && todayMonth > lastMonth);
              break;
            }
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

          // ── IDEMPOTENCY CHECK ────────────────────────────────────────────────
          const existingTx = await Transaction.exists({
            sourceRecurringId: item._id,
            date: { $gte: today, $lt: tomorrow },
          });

          if (existingTx) {
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

          // ── CREATE TRANSACTION ───────────────────────────────────────────────
          await Transaction.create({
            user: item.user,
            type: item.type,
            amount: item.amount,
            category: item.category,
            note: item.note || "",
            date: today,
            sourceRecurringId: item._id,
          });

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
          // ── DUPLICATE KEY ────────────────────────────────────────────────────
          if (err.code === 11000) {
            await RecurringTransaction.updateOne(
              { _id: item._id },
              { $set: { lastExecuted: today } },
            ).catch((syncErr) => {
              console.error(
                `  ✗ Could not sync lastExecuted after duplicate for ` +
                  `${item._id}: ${syncErr.message}`,
              );
            });
            recovered++;
            console.log(
              `  ↻ Duplicate prevented for "${item.title || item._id}" ` +
                `(unique index blocked second insert)`,
            );
            continue;
          }

          failed++;
          console.error(
            `  ✗ Error processing recurring item ${item._id} ` +
              `"${item.title || ""}": ${err.message}`,
          );
        }
      }
    } finally {
      await cursor.close();
    }

    console.log(
      `Recurring job complete — ` +
        `processed: ${processed}, skipped: ${skipped}, ` +
        `recovered: ${recovered}, failed: ${failed}`,
    );
  });
};
