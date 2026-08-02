import Joi from "joi";

const objectIdPattern = /^[a-f\d]{24}$/i;

export const transactionSchema = Joi.object({
  type: Joi.string().valid("income", "expense").required().messages({
    "any.only": "type must be 'income' or 'expense'",
    "any.required": "type is required",
  }),

  amount: Joi.number().positive().max(1_000_000_000).required().messages({
    "number.positive": "amount must be greater than zero",
    "number.max": "amount cannot exceed ₹1,000,000,000",
    "any.required": "amount is required",
  }),

  category: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "category must be a valid ObjectId",
    "any.required": "category is required",
  }),

  note: Joi.string().allow("").max(200).optional(),

  date: Joi.date().iso().max("now").required().messages({
    "date.format": "date must be an ISO 8601 date string",
    "date.max": "date cannot be in the future",
    "any.required": "date is required",
  }),

  paymentMethod: Joi.string()
    .valid("cash", "upi", "card", "bank")
    .optional()
    .messages({
      "any.only": "paymentMethod must be one of: cash, upi, card, bank",
    }),
});
