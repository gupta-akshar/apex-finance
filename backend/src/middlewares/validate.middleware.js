export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const data = source === "query" ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: source === "query",
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);

      return res.status(400).json({
        success: false,
        message: messages[0],
        errors: messages,
      });
    }

    if (source === "query") {
      req.validatedQuery = value;
    } else {
      req.validatedBody = value;
    }

    next();
  };
