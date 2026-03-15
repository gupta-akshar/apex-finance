import app from "./app.js";
import { loadEnv } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startRecurringJob } from "./jobs/recurring.job.js";

loadEnv();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // start recurring scheduler
    startRecurringJob();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
