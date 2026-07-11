// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidOrigin = (value) => {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value);
    // Only http and https schemes are accepted.
    if (!["http:", "https:"].includes(url.protocol)) return false;
    // The value must be a bare origin — no path, search, or hash.
    if (url.pathname !== "/") return false;
    if (url.search !== "") return false;
    if (url.hash !== "") return false;
    return true;
  } catch {
    return false;
  }
};

// ─── Main validation ──────────────────────────────────────────────────────────

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
      errors.push(`PORT must be a numeric value (got: "${process.env.PORT}").`);
    } else {
      const port = Number(process.env.PORT);
      if (port < 1 || port > 65535) {
        errors.push(
          `PORT must be between 1 and 65535 (got: ${process.env.PORT}).`,
        );
      }
    }
  }

  // ── CLIENT_URL ─────────────────────────────────────────────────────────────
  if (process.env.CLIENT_URL !== undefined) {
    if (!isValidOrigin(process.env.CLIENT_URL)) {
      errors.push(
        `CLIENT_URL must be a valid http/https origin with no trailing slash ` +
          `(got: "${process.env.CLIENT_URL}"). ` +
          `Example: "http://localhost:5173" or "https://app.example.com".`,
      );
    }
  }

  // ── Throw on first failure ─────────────────────────────────────────────────
  if (errors.length > 0) {
    throw new Error(
      `\n\nEnvironment validation failed:\n  • ${errors.join("\n  • ")}\n`,
    );
  }
};
