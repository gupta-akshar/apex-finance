import Joi from "joi";

// ─── Reusable field definitions ───────────────────────────────────────────────

const objectId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .message("category must be a valid ObjectId");

const frequency = Joi.string()
  .valid("daily", "weekly", "monthly", "yearly")
  .messages({
    "any.only": "frequency must be one of: daily, weekly, monthly, yearly",
  });

const type = Joi.string().valid("income", "expense").messages({
  "any.only": "type must be either 'income' or 'expense'",
});

const amount = Joi.number().positive().messages({
  "number.base": "amount must be a number",
  "number.positive": "amount must be a positive number",
});

const startDate = Joi.date().messages({
  "date.base": "startDate must be a valid date",
});

const endDate = Joi.date().greater(Joi.ref("startDate")).messages({
  "date.base": "endDate must be a valid date",
  "date.greater": "endDate must be after startDate",
});

// ─── Create schema — all required fields enforced ─────────────────────────────

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
    "string.pattern.base": "category must be a valid ObjectId",
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

  isActive: Joi.boolean().default(true),
});

// ─── Update schema — all fields optional, at least one must be present ────────

export const updateRecurringSchema = Joi.object({
  title: Joi.string().max(60).allow(""),

  type,

  amount,

  category: objectId.messages({
    "string.pattern.base": "category must be a valid ObjectId",
  }),

  frequency,

  startDate,

  endDate: Joi.date().messages({
    "date.base": "endDate must be a valid date",
  }),

  note: Joi.string().max(100).allow(""),

  isActive: Joi.boolean(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update",
  });
