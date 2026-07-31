const isValidOrigin = (value) => {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (url.pathname !== "/") return false;
    if (url.search !== "") return false;
    if (url.hash !== "") return false;
    return true;
  } catch {
    return false;
  }
};

export const validateEnv = () => {
  const errors = [];

  // ── MONGO_URI ──────────────────────────────────────────────────────────────
  if (!process.env.MONGO_URI || process.env.MONGO_URI.trim() === "") {
    errors.push("MONGO_URI is required and must not be empty.");
  }

  // ── JWT secrets ────────────────────────────────────────────────────────────
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

  // ── PORT ───────────────────────────────────────────────────────────────────
  if (process.env.PORT !== undefined) {
    if (!/^\d+$/.test(process.env.PORT)) {
      errors.push(`PORT must be numeric (got: "${process.env.PORT}").`);
    } else {
      const port = Number(process.env.PORT);
      if (port < 1 || port > 65535) {
        errors.push(
          `PORT must be between 1 and 65535 (got: ${process.env.PORT}).`,
        );
      }
    }
  }

  // ── CLIENT_URL — required; must be a valid http/https origin ──────────────
  if (!isValidOrigin(process.env.CLIENT_URL)) {
    errors.push(
      `CLIENT_URL is required and must be a valid http/https origin with no ` +
        `trailing slash (got: "${process.env.CLIENT_URL ?? "undefined"}"). ` +
        `Example: "https://app.example.com"`,
    );
  }

  // ── BCRYPT_ROUNDS — enforce minimum safe cost factor ──────────────────────
  if (process.env.BCRYPT_ROUNDS !== undefined) {
    const rounds = Number(process.env.BCRYPT_ROUNDS);
    if (!Number.isInteger(rounds) || rounds < 10) {
      errors.push(
        `BCRYPT_ROUNDS must be an integer >= 10 for adequate security ` +
          `(got: "${process.env.BCRYPT_ROUNDS}"). Recommended: 12 for production.`,
      );
    }
    if (rounds > 20) {
      errors.push(
        `BCRYPT_ROUNDS > 20 will cause login to time out. Max recommended is 14.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `\n\nEnvironment validation failed:\n  • ${errors.join("\n  • ")}\n`,
    );
  }
};
