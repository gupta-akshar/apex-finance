import Joi from "joi";

const objectId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .message("category must be a valid ObjectId");

const frequency = Joi.string()
  .valid("daily", "weekly", "monthly", "yearly")
  .messages({
    "any.only": "frequency must be one of: daily, weekly, monthly, yearly",
  });

const type = Joi.string()
  .valid("income", "expense")
  .messages({ "any.only": "type must be either 'income' or 'expense'" });

const amount = Joi.number().positive().max(1_000_000_000).messages({
  "number.base": "amount must be a number",
  "number.positive": "amount must be a positive number",
  "number.max": "amount cannot exceed ₹1,000,000,000",
});

const startDate = Joi.date()
  .iso()
  .messages({ "date.format": "startDate must be an ISO 8601 date string" });

const endDate = Joi.date().iso().min(Joi.ref("startDate")).messages({
  "date.format": "endDate must be an ISO 8601 date string",
  "date.min": "endDate must be on or after startDate",
});

const paymentMethod = Joi.string()
  .valid("cash", "upi", "card", "bank")
  .messages({
    "any.only": "paymentMethod must be one of: cash, upi, card, bank",
  });

// ─── Create schema ────────────────────────────────────────────────────────────

export const createRecurringSchema = Joi.object({
  title: Joi.string().max(60).allow("").default(""),

  type: type.required().messages({
    ...type.describe().messages,
    "any.required": "type is required",
  }),

  amount: amount.required().messages({
    ...amount.describe().messages,
    "any.required": "amount is required",
  }),

  category: objectId.required().messages({
    ...objectId.describe().messages,
    "any.required": "category is required",
  }),

  frequency: frequency.required().messages({
    ...frequency.describe().messages,
    "any.required": "frequency is required",
  }),

  startDate: startDate.required().messages({
    ...startDate.describe().messages,
    "any.required": "startDate is required",
  }),

  endDate: endDate.optional(),

  note: Joi.string().max(100).allow("").default(""),

  paymentMethod: paymentMethod.optional().default("bank"),

  isActive: Joi.boolean().default(true),
});

// ─── Update schema ────────────────────────────────────────────────────────────

export const updateRecurringSchema = Joi.object({
  title: Joi.string().max(60).allow(""),
  type,
  amount,
  category: objectId,
  frequency,
  startDate,

  endDate: Joi.date()
    .iso()
    .messages({ "date.format": "endDate must be an ISO 8601 date string" }),
  note: Joi.string().max(100).allow(""),
  paymentMethod,
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({ "object.min": "At least one field must be provided to update" });
