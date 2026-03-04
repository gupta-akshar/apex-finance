import Joi from "joi";

// Validator for /analytics/monthly
export const monthlySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required().messages({
    "any.required": "Month is required",
    "number.base": "Month must be a number",
    "number.min": "Month must be between 1 and 12",
    "number.max": "Month must be between 1 and 12",
  }),
  year: Joi.number().integer().min(2000).max(2100).required().messages({
    "any.required": "Year is required",
    "number.base": "Year must be a number",
    "number.min": "Year must be >= 2000",
    "number.max": "Year must be <= 2100",
  }),
});

// Validator for /analytics/categories
export const categoriesSchema = Joi.object({
  type: Joi.string().valid("income", "expense").required().messages({
    "any.required": "Transaction type is required",
    "any.only": "Transaction type must be either 'income' or 'expense'",
  }),
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
});

// Validator for /analytics/trend
export const trendSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required().messages({
    "any.required": "Year is required",
    "number.base": "Year must be a number",
    "number.min": "Year must be >= 2000",
    "number.max": "Year must be <= 2100",
  }),
});
