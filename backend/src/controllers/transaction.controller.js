import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildFilter = (userId, query) => {
  const { type, category, startDate, endDate, month, year } = query;
  const filter = { user: new mongoose.Types.ObjectId(userId) };

  if (type && ["income", "expense"].includes(type)) filter.type = type;

  if (category && mongoose.Types.ObjectId.isValid(category))
    filter.category = new mongoose.Types.ObjectId(category);

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  } else if (month && year) {
    const m = Number(month),
      y = Number(year);
    filter.date = {
      $gte: new Date(Date.UTC(y, m - 1, 1)),
      $lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
    };
  } else if (year) {
    const y = Number(year);
    filter.date = {
      $gte: new Date(Date.UTC(y, 0, 1)),
      $lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
    };
  }

  return filter;
};

const buildSort = (sort) => {
  switch (sort) {
    case "oldest":
      return { date: 1 };
    case "highest":
      return { amount: -1, date: -1 };
    case "lowest":
      return { amount: 1, date: -1 };
    default:
      return { date: -1 }; // "latest"
  }
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const applyTransactionFields = (doc, source) => {
  if (source.type !== undefined && ["income", "expense"].includes(source.type))
    doc.type = source.type;
  if (source.amount !== undefined) doc.amount = source.amount;
  if (source.category !== undefined) doc.category = source.category;
  if (source.note !== undefined) doc.note = source.note;
  if (source.date !== undefined) doc.date = source.date;
  if (source.paymentMethod !== undefined)
    doc.paymentMethod = source.paymentMethod;
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
// @route  POST /api/transactions
// @access Private
export const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, note, date, paymentMethod } = req.body;

    if (!type || !amount || !category || !date)
      return res.status(400).json({ message: "Required fields missing" });

    const categoryDoc = await Category.findOne({
      _id: category,
      user: req.user._id,
    });
    if (!categoryDoc)
      return res
        .status(400)
        .json({ message: "Category not found or does not belong to you" });

    // ── Budget warning ────────────────────────────────────────────────────────
    let budgetWarning = false,
      warningMessage = "";

    if (type === "expense") {
      const d = date instanceof Date ? date : new Date(date);
      const month = d.getUTCMonth() + 1;
      const year = d.getUTCFullYear();

      const budget = await Budget.findOne({
        user: req.user._id,
        category,
        month,
        year,
      });

      if (budget) {
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        const [agg] = await Transaction.aggregate([
          {
            $match: {
              user: req.user._id,
              type: "expense",
              category: new mongoose.Types.ObjectId(category),
              date: { $gte: startDate, $lte: endDate },
            },
          },
          { $group: { _id: null, spent: { $sum: "$amount" } } },
        ]);

        const newTotal = (agg?.spent || 0) + Number(amount);
        if (newTotal > budget.limit) {
          budgetWarning = true;
          warningMessage = `You exceeded your budget by ₹${(newTotal - budget.limit).toFixed(2)}`;
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
    res.status(201).json({ transaction, budgetWarning, warningMessage });
  } catch (error) {
    next(error);
  }
};

// ─── GET ──────────────────────────────────────────────────────────────────────
// @route  GET /api/transactions
// @access Private
export const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const sort = buildSort(req.query.sort);
    const search = req.query.search?.trim() || "";
    const filter = buildFilter(req.user._id, req.query);

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      const [result] = await Transaction.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        { $match: { $or: [{ "category.name": regex }, { note: regex }] } },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $sort: sort },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  type: 1,
                  amount: 1,
                  note: 1,
                  date: 1,
                  paymentMethod: 1,
                  createdAt: 1,
                  category: { _id: 1, name: 1, type: 1 },
                },
              },
            ],
          },
        },
      ]);

      const total = result?.metadata?.[0]?.total ?? 0;
      const transactions = result?.data ?? [];

      return res.status(200).json({
        transactions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit) || 0,
          limit,
        },
      });
    }

    // Non-search: standard find (uses compound indexes, already efficient)
    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .populate("category", "name type")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      transactions,
      pagination: { total, page, pages: Math.ceil(total / limit) || 0, limit },
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
// @route  PUT /api/transactions/:id
// @access Private
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    applyTransactionFields(transaction, req.body);
    const updated = await transaction.save();
    res.status(200).json({ transaction: updated });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
// @route  DELETE /api/transactions/:id
// @access Private
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    await transaction.deleteOne();
    res.status(200).json({ message: "Transaction deleted" });
  } catch (error) {
    next(error);
  }
};
