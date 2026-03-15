import cron from "node-cron";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";

export const startRecurringJob = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running recurring transactions job...");

    const recurringList = await RecurringTransaction.find({
      isActive: true,
    });

    const today = new Date();

    for (const item of recurringList) {
      const last = item.lastExecuted || item.startDate;

      const diffDays = (today - new Date(last)) / (1000 * 60 * 60 * 24);

      let shouldRun = false;

      if (item.frequency === "daily" && diffDays >= 1) {
        shouldRun = true;
      }

      if (item.frequency === "weekly" && diffDays >= 7) {
        shouldRun = true;
      }

      if (item.frequency === "monthly") {
        const lastDate = new Date(last);

        if (
          today.getMonth() !== lastDate.getMonth() ||
          today.getFullYear() !== lastDate.getFullYear()
        ) {
          shouldRun = true;
        }
      }

      if (!shouldRun) continue;

      await Transaction.create({
        user: item.user,
        type: item.type,
        amount: item.amount,
        category: item.category,
        date: today,
      });

      item.lastExecuted = today;
      await item.save();
    }
  });
};
