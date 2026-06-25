import dotenv from "dotenv";

export const loadEnv = () => {
  const result = dotenv.config();

  if (result.error) {
    console.info(
      "[env] No .env file found — relying on host-provided environment variables.",
    );
    return;
  }

  console.info("[env] Environment variables loaded from .env");
};
