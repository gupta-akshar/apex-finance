import Transaction from "../models/Transaction.js";
// import { getTransactionsService } from "../services/transaction.service.js";

import Budget from "../models/Budget.js";

// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, note, date, paymentMethod } = req.body;

    if (!type || !amount || !category || !date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    let budgetWarning = false;
    let warningMessage = "";

    if (type === "expense") {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const budget = await Budget.findOne({
        user: req.user._id,
        category,
        month,
        year,
      });

      if (budget) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const result = await Transaction.aggregate([
          {
            $match: {
              user: req.user._id,
              type: "expense",
              category,
              date: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          {
            $group: {
              _id: null,
              spent: { $sum: "$amount" },
            },
          },
        ]);

        const spent = result[0]?.spent || 0;
        const newTotal = spent + amount;

        if (newTotal > budget.limit) {
          budgetWarning = true;
          warningMessage = `You exceeded your ${category} budget by ₹${newTotal - budget.limit}`;
        }
      }
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount,
      category,
      note,
      date,
      paymentMethod,
    });

    res.status(201).json({
      transaction,
      budgetWarning,
      warningMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const total = await Transaction.countDocuments({
      user: req.user._id,
    });

    const transactions = await Transaction.find({
      user: req.user._id,
    })
      .populate("category", "name type")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
      },
    });
  } catch (error) {
    next(error);
  }
};
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    Object.assign(transaction, req.body);

    const updated = await transaction.save();

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await transaction.deleteOne();

    res.status(200).json({ message: "Transaction deleted" });
  } catch (error) {
    next(error);
  }
};
