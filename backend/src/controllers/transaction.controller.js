import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import mongoose from "mongoose";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a MongoDB filter object from request query params.
 * All filters are scoped to the logged-in user.
 */
const buildFilter = (userId, query) => {
  const { type, category, startDate, endDate, month, year, search } = query;

  const filter = { user: new mongoose.Types.ObjectId(userId) };

  // type: "income" | "expense"
  if (type && ["income", "expense"].includes(type)) {
    filter.type = type;
  }

  // category: ObjectId string
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = new mongoose.Types.ObjectId(category);
  }

  // date range — explicit startDate / endDate take priority
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) {
      // Include the full end day (up to 23:59:59)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  } else if (month && year) {
    // Monthly filter
    const m = Number(month);
    const y = Number(year);
    filter.date = {
      $gte: new Date(y, m - 1, 1),
      $lte: new Date(y, m, 0, 23, 59, 59, 999),
    };
  } else if (year) {
    // Yearly filter
    const y = Number(year);
    filter.date = {
      $gte: new Date(y, 0, 1),
      $lte: new Date(y, 11, 31, 23, 59, 59, 999),
    };
  }

  // search: matched against populated category name or note (done via aggregation — see below)
  // We'll handle text search at the aggregation stage, not here.

  return filter;
};

/**
 * Map sort param to a MongoDB sort object.
 */
const buildSort = (sort) => {
  switch (sort) {
    case "oldest":
      return { date: 1 };
    case "highest":
      return { amount: -1, date: -1 };
    case "lowest":
      return { amount: 1, date: -1 };
    case "latest":
    default:
      return { date: -1 };
  }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
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
              category: new mongoose.Types.ObjectId(category),
              date: { $gte: startDate, $lte: endDate },
            },
          },
          { $group: { _id: null, spent: { $sum: "$amount" } } },
        ]);

        const spent = result[0]?.spent || 0;
        const newTotal = spent + Number(amount);

        if (newTotal > budget.limit) {
          budgetWarning = true;
          warningMessage = `You exceeded your budget by ₹${(
            newTotal - budget.limit
          ).toFixed(2)}`;
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

// ─── GET (paginated + filtered) ───────────────────────────────────────────────
// @route   GET /api/transactions
// @access  Private
// Query params: page, limit, type, category, startDate, endDate, month, year,
//               search, sort (latest|oldest|highest|lowest)
export const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const sort = buildSort(req.query.sort);
    const search = req.query.search?.trim() || "";

    const filter = buildFilter(req.user._id, req.query);

    // ── With search: use aggregation so we can filter on populated category.name
    if (search) {
      const searchRegex = new RegExp(search, "i");

      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmpty: true } },
        {
          $match: {
            $or: [{ "category.name": searchRegex }, { note: searchRegex }],
          },
        },
      ];

      // Count before pagination
      const countPipeline = [...pipeline, { $count: "total" }];
      const countResult = await Transaction.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      // Paginated results
      const dataPipeline = [
        ...pipeline,
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
      ];

      const transactions = await Transaction.aggregate(dataPipeline);

      return res.status(200).json({
        transactions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      });
    }

    // ── Without search: use standard find + populate (faster)
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
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
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

    res.status(200).json({ transaction: updated });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
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
