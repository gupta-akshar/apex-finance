import Joi from "joi";

// ─── Reusable field definitions ───────────────────────────────────────────────

const objectId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .messages({
    "string.pattern.base": "category must be a valid ObjectId",
  });

const month = Joi.number().integer().min(1).max(12).messages({
  "number.base": "month must be a number",
  "number.integer": "month must be an integer",
  "number.min": "month must be between 1 and 12",
  "number.max": "month must be between 1 and 12",
});

const year = Joi.number().integer().min(2000).max(2100).messages({
  "number.base": "year must be a number",
  "number.integer": "year must be an integer",
  "number.min": "year must be >= 2000",
  "number.max": "year must be <= 2100",
});

// ─── POST /api/budgets — create or update a budget ───────────────────────────

export const setBudgetSchema = Joi.object({
  category: objectId.required().messages({
    "any.required": "category is required",
    "string.pattern.base": "category must be a valid ObjectId",
  }),

  limit: Joi.number().positive().required().messages({
    "any.required": "limit is required",
    "number.base": "limit must be a number",
    "number.positive": "limit must be a positive number",
  }),

  month: month.required().messages({
    ...month.describe().messages,
    "any.required": "month is required",
  }),

  year: year.required().messages({
    ...year.describe().messages,
    "any.required": "year is required",
  }),
});

// ─── GET /api/budgets/status?month=M&year=Y ───────────────────────────────────

export const getBudgetStatusSchema = Joi.object({
  month: month.required().messages({
    ...month.describe().messages,
    "any.required": "month is required",
  }),

  year: year.required().messages({
    ...year.describe().messages,
    "any.required": "year is required",
  }),
});

// ─── GET /api/budgets?month=M&year=Y  (both optional) ────────────────────────

export const getBudgetsSchema = Joi.object({
  month: month.optional(),
  year: year.optional(),
});
