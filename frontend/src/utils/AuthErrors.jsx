// ─── Pattern → message table ──────────────────────────────────────────────────

const PATTERNS = [
  // Refresh-token / JWT internals (must NEVER reach users)
  {
    match: /no refresh token/i,
    msg: "Invalid email or password.",
  },
  {
    match: /refresh token (expired|invalid|not found)/i,
    msg: "Your session has expired. Please sign in again.",
  },
  {
    match: /invalid refresh token/i,
    msg: "Invalid email or password.",
  },
  {
    match: /jwt (malformed|invalid|expired|signature)/i,
    msg: "Invalid email or password.",
  },
  {
    match: /token expired/i,
    msg: "Please sign in again.",
  },
  {
    match: /not authorized/i,
    msg: "Invalid email or password.",
  },

  // Credential errors
  {
    match: /invalid credentials/i,
    msg: "Invalid email or password.",
  },
  {
    match: /user not found/i,
    msg: "No account found with this email.",
  },
  {
    match: /no account/i,
    msg: "No account found with this email.",
  },
  {
    match: /wrong password|incorrect password/i,
    msg: "Invalid email or password.",
  },

  // Account state
  {
    match: /account.*disabled|disabled.*account/i,
    msg: "Your account has been disabled. Please contact support.",
  },
  {
    match: /email.*not.*verified/i,
    msg: "Please verify your email before signing in.",
  },

  // Rate limiting
  {
    match: /too many (login|requests|attempts)/i,
    msg: "Too many login attempts. Please try again later.",
  },
  {
    match: /rate limit/i,
    msg: "Too many requests. Please slow down and try again.",
  },

  // Registration
  {
    match: /user already exists|email.*already/i,
    msg: "An account with this email already exists.",
  },
  {
    match: /all fields are required/i,
    msg: "Please fill in all required fields.",
  },

  // MongoDB / server internals (must NEVER show raw to users)
  {
    match: /mongo|mongoose|e11000|duplicate key/i,
    msg: "Something went wrong. Please try again.",
  },
  {
    match: /cast to objectid|invalid id/i,
    msg: "Something went wrong. Please try again.",
  },
  {
    match: /network error|econnrefused|enotfound/i,
    msg: "Unable to reach the server. Check your connection and try again.",
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Map an Axios error (or plain Error) to a safe, user-friendly string.
 *
 * @param {unknown} error  - The caught error from an API call
 * @param {"login"|"register"|"general"} [context="general"]
 * @returns {string}
 */
export function mapAuthError(error, context = "general") {
  // 1. Extract the raw message from wherever it lives
  const raw =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    "";

  const normalized = String(raw).trim();

  // 2. Walk the pattern table
  for (const { match, msg } of PATTERNS) {
    if (match.test(normalized)) return msg;
  }

  // 3. HTTP status fallbacks (when no message body)
  const status = error?.response?.status;
  if (status === 401 || status === 403) return "Invalid email or password.";
  if (status === 404) return "No account found with this email.";
  if (status === 409) return "An account with this email already exists.";
  if (status === 429) return "Too many attempts. Please try again later.";
  if (status >= 500)
    return "Something went wrong on our end. Please try again.";

  // 4. Network-level error (no response at all)
  if (error?.code === "ERR_NETWORK" || error?.code === "ECONNABORTED") {
    return "Unable to reach the server. Check your connection and try again.";
  }

  // 5. Context-specific defaults
  if (context === "login") return "Invalid email or password.";
  if (context === "register") return "Registration failed. Please try again.";
  return "Something went wrong. Please try again.";
}
