import Transaction from "../models/Transaction.js";

export const getTransactionsService = async (userId, query) => {
  const {
    page = 1,
    limit = 10,
    type,
    category,
    startDate,
    endDate,
    sortBy = "createdAt",
    order = "desc",
  } = query;

  const filter = { user: userId };

  // Filtering
  if (type) {
    filter.type = type;
  }

  if (category) {
    filter.category = category;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Sorting
  const sortOptions = {
    [sortBy]: order === "asc" ? 1 : -1,
  };

  const transactions = await Transaction.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit));

  const total = await Transaction.countDocuments(filter);

  return {
    transactions,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
};
