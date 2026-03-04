import Transaction from "../models/Transaction.js";
import { getTransactionsService } from "../services/transaction.service.js";

// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, note, date, paymentMethod } = req.body;

    if (!type || !amount || !category || !date) {
      return res.status(400).json({ message: "Required fields missing" });
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

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      type,
      category,
      startDate,
      endDate,
      sortBy = "date",
      order = "desc",
    } = req.query;

    // Convert to numbers safely
    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit))); // max limit = 50

    const query = { user: req.user._id };

    // Type filter
    if (type) {
      query.type = type;
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Date filter (independent checks)
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Whitelist allowed sort fields
    const allowedSortFields = ["date", "amount", "createdAt"];
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = "date";
    }

    const sortOptions = {
      [sortBy]: order === "asc" ? 1 : -1,
    };

    const transactions = await Transaction.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: transactions.length,
      data: transactions,
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
