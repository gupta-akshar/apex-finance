import dotenv from "dotenv";

export const loadEnv = () => {
  const result = dotenv.config();

  if (result.error) {
    throw new Error("Failed to load environment variables");
  }

  console.log("Environment variables loaded");
};
