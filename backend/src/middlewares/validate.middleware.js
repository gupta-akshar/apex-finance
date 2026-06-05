// middlewares/validate.middleware.js

/**
 * Validation middleware factory.
 *
 * @param {import("joi").Schema} schema - Joi schema to validate against
 * @param {"body"|"query"} source       - Which part of the request to validate.
 *                                        GET routes pass query-string params so
 *                                        use "query"; POST/PUT routes use "body".
 */
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const data = source === "query" ? req.query : req.body;

    const { error } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: source === "query",
    });

    if (error) {
      const messages = error.details.map((err) => err.message);

      return res.status(400).json({
        success: false,
        errors: messages,
      });
    }

    next();
  };
