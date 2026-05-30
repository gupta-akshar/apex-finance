export const validateEnv = () => {
  const errors = [];

  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
    errors.push("MONGO_URI is required and must not be empty.");
  }

  if (
    !process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_ACCESS_SECRET.length < 32
  ) {
    errors.push("JWT_ACCESS_SECRET must be at least 32 characters.");
  }

  if (
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET.length < 32
  ) {
    errors.push("JWT_REFRESH_SECRET must be at least 32 characters.");
  }

  if (process.env.PORT !== undefined && !/^\d+$/.test(process.env.PORT)) {
    errors.push(`PORT must be a numeric value (got: "${process.env.PORT}").`);
  }

  if (errors.length > 0) {
    throw new Error(
      `\n\nEnvironment validation failed:\n  • ${errors.join("\n  • ")}\n`,
    );
  }
};
