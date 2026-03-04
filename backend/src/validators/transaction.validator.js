import Joi from "joi";

export const transactionSchema = Joi.object({
  type: Joi.string().valid("income", "expense").required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().min(2).required(),
  note: Joi.string().allow("").max(200),
  date: Joi.date().required(),
  paymentMethod: Joi.string().valid("cash", "upi", "card", "bank"),
});
