import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌  MONGO_URI not set. Aborting.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri);
  console.log("Connected.\n");

  const db = mongoose.connection.db;
  const users = db.collection("users");

  // Find users that still have the old plaintext refreshToken field
  const cursor = users.find({ refreshToken: { $exists: true } });
  let migrated = 0;
  let skipped = 0;

  for await (const user of cursor) {
    if (!user.refreshToken) {
      // Field exists but is null — just rename it
      await users.updateOne(
        { _id: user._id },
        {
          $rename: { refreshToken: "refreshTokenHash" },
        },
      );
    } else {
      // Hash the existing token and rename
      await users.updateOne(
        { _id: user._id },
        {
          $set: { refreshTokenHash: hashToken(user.refreshToken) },
          $unset: { refreshToken: "" },
        },
      );
    }
    migrated++;
  }

  // Count users that already have the new field
  skipped = await users.countDocuments({
    refreshToken: { $exists: false },
    refreshTokenHash: { $exists: true },
  });

  console.log(`
─────────────────────────────────────────
Migration complete — refreshToken → refreshTokenHash
─────────────────────────────────────────
  Migrated : ${migrated}
  Already migrated / skipped : ${skipped}
─────────────────────────────────────────`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Fatal:", err);
  process.exitCode = 1;
  mongoose.disconnect();
});
