export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const data = source === "query" ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: source === "query",

      stripUnknown: source === "query",
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({
        success: false,
        message: messages[0], // first message as a plain string (matches controller shape)
        errors: messages, // full array for programmatic / test consumers
      });
    }

    if (source === "query") {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
