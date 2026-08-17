import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import mongoose from "mongoose";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_AMOUNT = 1_000_000_000; // ₹1 billion hard cap prevents Infinity storage

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
      end.setUTCHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  } else if (month && year) {
    const m = Number(month);
    const y = Number(year);
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
      return { date: -1 };
  }
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, note, date, paymentMethod } = req.body;

    if (!type || !amount || !category || !date)
      return res.status(400).json({ message: "Required fields missing" });

    const parsedAmount = Number(amount);
    if (
      !isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > MAX_AMOUNT
    ) {
      return res.status(400).json({
        message: `Amount must be a positive finite number no greater than ${MAX_AMOUNT}`,
      });
    }

    const categoryDoc = await Category.findOne({
      _id: category,
      user: req.user._id,
    });
    if (!categoryDoc)
      return res
        .status(400)
        .json({ message: "Category not found or does not belong to you" });

    // ── Budget warning ────────────────────────────────────────────────────────
    let budgetWarning = false;
    let warningMessage = "";

    if (type === "expense") {
      const d = new Date(date);

      const month = d.getUTCMonth() + 1;
      const year = d.getUTCFullYear();

      const budget = await Budget.findOne({
        user: req.user._id,
        category: new mongoose.Types.ObjectId(category),
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

        const spentCents = Math.round((agg?.spent || 0) * 100);
        const newAmountCents = Math.round(parsedAmount * 100);
        const limitCents = Math.round(budget.limit * 100);
        const newTotalCents = spentCents + newAmountCents;

        if (newTotalCents > limitCents) {
          budgetWarning = true;
          const overspendRupees = ((newTotalCents - limitCents) / 100).toFixed(
            2,
          );
          warningMessage = `You exceeded your budget by ₹${overspendRupees}`;
        }
      }
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount: parsedAmount,
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
export const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const sort = buildSort(req.query.sort);
    const search = req.query.search?.trim() || "";
    const filter = buildFilter(req.user._id, req.query);

    if (search) {
      const safeSearch = search.slice(0, 100);
      const regex = new RegExp(escapeRegex(safeSearch), "i");

      const [result] = await Transaction.aggregate(
        [
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
        ],
        { maxTimeMS: 10000 },
      );

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

    const [result] = await Transaction.aggregate(
      [
        { $match: filter },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [
              { $sort: sort },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: "categories",
                  localField: "category",
                  foreignField: "_id",
                  as: "category",
                },
              },
              {
                $unwind: {
                  path: "$category",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  type: 1,
                  amount: 1,
                  note: 1,
                  date: 1,
                  paymentMethod: 1,
                  createdAt: 1,
                  sourceRecurringId: 1,
                  category: { _id: 1, name: 1, type: 1 },
                },
              },
            ],
          },
        },
      ],
      { maxTimeMS: 10000 },
    );

    const total = result?.metadata?.[0]?.total ?? 0;
    const transactions = result?.data ?? [];

    return res.status(200).json({
      transactions,
      pagination: { total, page, pages: Math.ceil(total / limit) || 0, limit },
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    const { type, amount, category, note, date, paymentMethod } = req.body;

    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ message: "Invalid transaction type" });
      }
      transaction.type = type;
    }

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (
        !isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        parsedAmount > MAX_AMOUNT
      ) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      transaction.amount = parsedAmount;
    }

    if (category !== undefined) {
      const categoryDoc = await Category.findOne({
        _id: category,
        user: req.user._id,
      });
      if (!categoryDoc) {
        return res
          .status(403)
          .json({ message: "Category not found or does not belong to you" });
      }
      transaction.category = category;
    }

    if (note !== undefined) transaction.note = note;
    if (date !== undefined) transaction.date = date;
    if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod;

    const updated = await transaction.save();
    res.status(200).json({ transaction: updated });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    res.status(200).json({ message: "Transaction deleted" });
  } catch (error) {
    next(error);
  }
};
