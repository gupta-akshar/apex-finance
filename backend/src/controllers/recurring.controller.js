import RecurringTransaction from "../models/RecurringTransaction.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pickFields = (body) => {
  const {
    title,
    type,
    amount,
    category,
    frequency,
    startDate,
    endDate,
    note,
    isActive,
  } = body;

  const doc = {};

  // Required fields — only set if present so partial updates keep old values
  if (title !== undefined) doc.title = title;
  if (type !== undefined) doc.type = type;
  if (amount !== undefined) doc.amount = Number(amount);
  if (category !== undefined) doc.category = category;
  if (frequency !== undefined) doc.frequency = frequency;
  if (startDate !== undefined) doc.startDate = startDate;

  // Optional fields — always include (null/empty-string are valid resets)
  if (endDate !== undefined) doc.endDate = endDate || null;
  if (note !== undefined) doc.note = note ?? "";

  if (isActive !== undefined) doc.isActive = Boolean(isActive);
  else if (body.active !== undefined) doc.isActive = Boolean(body.active);

  return doc;
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
// POST /api/recurring
export const createRecurringTransaction = async (req, res, next) => {
  try {
    const fields = pickFields(req.body);

    // Validate required fields explicitly so we can return a helpful 400
    const missing = [
      "type",
      "amount",
      "category",
      "frequency",
      "startDate",
    ].filter((k) => fields[k] === undefined || fields[k] === "");

    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Required fields missing: ${missing.join(", ")}` });
    }

    const recurring = await RecurringTransaction.create({
      ...fields,
      user: req.user._id,
    });

    res.status(201).json(recurring);
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL ──────────────────────────────────────────────────────────────────
// GET /api/recurring
export const getRecurringTransactions = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(recurring);
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
// PUT /api/recurring/:id
// Works for both full edits and toggle-only payloads like { isActive: false }.
export const updateRecurringTransaction = async (req, res, next) => {
  try {
    const fields = pickFields(req.body);

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const recurring = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: fields },
      { new: true, runValidators: true },
    );

    if (!recurring) {
      return res
        .status(404)
        .json({ message: "Recurring transaction not found" });
    }

    res.json(recurring);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
// DELETE /api/recurring/:id
export const deleteRecurringTransaction = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!recurring) {
      return res
        .status(404)
        .json({ message: "Recurring transaction not found" });
    }

    res.json({ message: "Recurring transaction deleted" });
  } catch (error) {
    next(error);
  }
};
