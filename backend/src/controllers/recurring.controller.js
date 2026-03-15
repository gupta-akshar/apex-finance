import RecurringTransaction from "../models/RecurringTransaction.js";

export const createRecurringTransaction = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.create({
      ...req.body,
      user: req.user._id,
    });

    res.status(201).json(recurring);
  } catch (error) {
    next(error);
  }
};

export const getRecurringTransactions = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.find({
      user: req.user._id,
    });

    res.json(recurring);
  } catch (error) {
    next(error);
  }
};

export const updateRecurringTransaction = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    res.json(recurring);
  } catch (error) {
    next(error);
  }
};

export const deleteRecurringTransaction = async (req, res, next) => {
  try {
    await RecurringTransaction.findByIdAndDelete(req.params.id);

    res.json({ message: "Recurring transaction deleted" });
  } catch (error) {
    next(error);
  }
};
