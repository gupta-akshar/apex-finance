import pino from "pino";

const logger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "production" ? "info" : "debug"),

  timestamp: pino.stdTimeFunctions.isoTime,

  base: { pid: process.pid },

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.currentPassword",
      "*.newPassword",
      "*.refreshToken",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },
});

export default logger;
