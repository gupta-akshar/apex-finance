import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";

// CREATE OR UPDATE BUDGET
export const setBudget = async (req, res, next) => {
  try {
    const { category, limit, month, year } = req.body;

    if (!category || !limit || !month || !year) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const budget = await Budget.findOneAndUpdate(
      {
        user: req.user._id,
        category,
        month,
        year,
      },
      {
        limit,
      },
      { new: true, upsert: true },
    );

    res.status(200).json(budget);
  } catch (error) {
    next(error);
  }
};

// GET BUDGET STATUS (progress + percentage)
export const getBudgetStatus = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }

    const budgets = await Budget.find({
      user: req.user._id,
      month,
      year,
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const expenses = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: "expense",
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$category",
          spent: { $sum: "$amount" },
        },
      },
    ]);

    const spentMap = {};
    expenses.forEach((e) => {
      spentMap[e._id] = e.spent;
    });

    const result = budgets.map((budget) => {
      const spent = spentMap[budget.category] || 0;
      const remaining = budget.limit - spent;
      const percentage = Number(((spent / budget.limit) * 100).toFixed(2));

      return {
        category: budget.category,
        limit: budget.limit,
        spent,
        remaining,
        percentage,
        warning: percentage >= 80,
        exceeded: spent > budget.limit,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// DELETE BUDGET
export const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    next(error);
  }
};
