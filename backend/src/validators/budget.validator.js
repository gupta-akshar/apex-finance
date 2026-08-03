import Joi from "joi";

const objectId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .messages({ "string.pattern.base": "category must be a valid ObjectId" });

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

export const setBudgetSchema = Joi.object({
  category: objectId.required().messages({
    "any.required": "category is required",
    "string.pattern.base": "category must be a valid ObjectId",
  }),

  limit: Joi.number().positive().max(1_000_000_000).required().messages({
    "any.required": "limit is required",
    "number.base": "limit must be a number",
    "number.positive": "limit must be a positive number",
    "number.max": "limit cannot exceed ₹1,000,000,000",
  }),

  month: month.required().messages({
    "any.required": "month is required",
  }),

  year: year.required().messages({
    "any.required": "year is required",
  }),
});

export const getBudgetStatusSchema = Joi.object({
  month: month.required().messages({ "any.required": "month is required" }),
  year: year.required().messages({ "any.required": "year is required" }),
});

export const getBudgetsSchema = Joi.object({
  month: month.optional(),
  year: year.optional(),
});
