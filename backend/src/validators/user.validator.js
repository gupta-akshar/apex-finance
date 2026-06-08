import Joi from "joi";

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  currency: Joi.string()
    .length(3)
    .uppercase()
    .pattern(/^[A-Z]{3}$/)
    .messages({
      "string.length":
        "Currency must be a 3-letter ISO-4217 code (e.g. USD, INR).",
      "string.uppercase": "Currency must be uppercase.",
      "string.pattern.base":
        "Currency must contain only uppercase letters (e.g. USD, INR).",
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});
