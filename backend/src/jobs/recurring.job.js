import cron from "node-cron";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

export const startRecurringJob = () => {
  // Runs every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running recurring transactions job…");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only process active records whose startDate is today or in the past
    const recurringList = await RecurringTransaction.find({
      isActive: true,
      startDate: { $lte: today },
    });

    for (const item of recurringList) {
      // ── Respect endDate ────────────────────────────────────────────────────
      if (item.endDate) {
        const end = new Date(item.endDate);
        end.setHours(23, 59, 59, 999);
        if (today > end) {
          // Past the end date — deactivate silently instead of posting
          item.isActive = false;
          await item.save();
          continue;
        }
      }

      // ── Determine whether this item should run today ───────────────────────
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
          // Run if we've crossed into a new calendar month since last execution
          const lastMonth = last.getMonth();
          const lastYear = last.getFullYear();
          const todayMonth = today.getMonth();
          const todayYear = today.getFullYear();
          shouldRun =
            todayYear > lastYear ||
            (todayYear === lastYear && todayMonth > lastMonth);
          break;
        }

        case "yearly": {
          // Run if we've crossed into a new calendar year since last execution
          shouldRun = today.getFullYear() > last.getFullYear();
          break;
        }

        default:
          shouldRun = false;
      }

      if (!shouldRun) continue;

      // ── Create the actual transaction ──────────────────────────────────────
      await Transaction.create({
        user: item.user,
        type: item.type,
        amount: item.amount,
        category: item.category,
        note: item.note || "",
        date: today,
      });

      item.lastExecuted = today;
      await item.save();

      console.log(
        `  ✓ Posted recurring "${item.title || item._id}" for user ${item.user}`,
      );
    }
  });
};
