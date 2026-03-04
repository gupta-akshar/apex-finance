import Transaction from "../models/Transaction.js";

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
    const { page = 1, limit = 10, type, startDate, endDate } = req.query;

    const query = { user: req.user._id };

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
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
