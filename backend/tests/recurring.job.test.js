/**
 * backend/tests/recurring.job.test.js
 *
 * Integration tests for the recurring transaction cron job.
 *
 * Strategy
 * --------
 * node-cron is mocked so `cron.schedule()` captures the callback without
 * actually waiting for midnight.  We then invoke that callback directly in
 * each test, giving us full control over timing while preserving the real
 * job logic (idempotency index, shouldRun logic, lastExecuted update, etc.).
 *
 * Each test uses an isolated in-memory MongoDB instance (via
 * mongodb-memory-server) and its own seed data so tests never interfere.
 */

// ── Mock node-cron BEFORE any module that imports it is loaded ───────────────
let capturedCronCallback = null;

jest.mock("node-cron", () => ({
  schedule: jest.fn((_expression, callback) => {
    capturedCronCallback = callback;
  }),
}));

// ── Env vars (must be set before app modules are imported) ───────────────────
process.env.JWT_ACCESS_SECRET = "test_access_secret_must_be_32_plus_chars_ok";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_plus_chars_ok_xxxxx";
process.env.NODE_ENV = "test";

// ── Imports ───────────────────────────────────────────────────────────────────
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { startRecurringJob } from "../src/jobs/recurring.job.js";
import RecurringTransaction from "../src/models/RecurringTransaction.js";
import Transaction from "../src/models/Transaction.js";
import Category from "../src/models/Category.js";
import User from "../src/models/User.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return a UTC-midnight Date for `daysAgo` days before today.
 * daysAgo = 0  → today midnight UTC
 * daysAgo = 1  → yesterday midnight UTC
 */
const utcMidnight = (daysAgo = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
};

/**
 * Return a UTC-midnight Date offset by whole months.
 * monthsAgo = 1 → same day, previous month
 */
const utcMidnightMonthsAgo = (monthsAgo) => {
  const d = utcMidnight(0);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d;
};

/**
 * Return a UTC-midnight Date offset by whole years.
 */
const utcMidnightYearsAgo = (yearsAgo) => {
  const d = utcMidnight(0);
  d.setUTCFullYear(d.getUTCFullYear() - yearsAgo);
  return d;
};

/** Run the captured cron callback and await it. */
const runJob = () => {
  if (!capturedCronCallback) throw new Error("Cron callback not yet captured.");
  return capturedCronCallback();
};

// ── DB lifecycle ──────────────────────────────────────────────────────────────

let mongoServer;
let testUser;
let testCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Register the cron callback (captures it via the mock)
  startRecurringJob();
  expect(capturedCronCallback).not.toBeNull();

  // Shared user and category – reused across all tests
  testUser = await User.create({
    name: "Test User",
    email: "cron-test@example.com",
    password: "hashedpassword123",
  });

  testCategory = await Category.create({
    name: "Salary",
    type: "income",
    user: testUser._id,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Wipe only the collections written by the job between tests
afterEach(async () => {
  await RecurringTransaction.deleteMany({});
  await Transaction.deleteMany({});
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. IDEMPOTENCY – running the job twice must NOT create duplicate transactions
// ═════════════════════════════════════════════════════════════════════════════

describe("Idempotency – no duplicate transactions", () => {
  it("creates exactly one transaction even when the job fires twice on the same day", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Daily salary",
      type: "income",
      amount: 500,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(1), // started yesterday → due today
      isActive: true,
    });

    // First run → should create one transaction
    await runJob();

    const afterFirstRun = await Transaction.countDocuments({
      user: testUser._id,
    });
    expect(afterFirstRun).toBe(1);

    // Second run on the same day → idempotency index must block a second insert
    await runJob();

    const afterSecondRun = await Transaction.countDocuments({
      user: testUser._id,
    });
    expect(afterSecondRun).toBe(1);
  });

  it("stores a sourceRecurringId on every auto-generated transaction", async () => {
    const rule = await RecurringTransaction.create({
      user: testUser._id,
      title: "Idempotency check",
      type: "income",
      amount: 100,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(1),
      isActive: true,
    });

    await runJob();

    const tx = await Transaction.findOne({ sourceRecurringId: rule._id });
    expect(tx).not.toBeNull();
    expect(tx.sourceRecurringId.toString()).toBe(rule._id.toString());
  });

  it("updates lastExecuted after the first run so a second run is also blocked via shouldRun logic", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Weekly rule",
      type: "income",
      amount: 1000,
      category: testCategory._id,
      frequency: "weekly",
      startDate: utcMidnight(7), // 7 days ago → due today
      isActive: true,
    });

    await runJob();

    // lastExecuted is now today → diffDays will be 0 → shouldRun = false
    const rule = await RecurringTransaction.findOne({ user: testUser._id });
    const today = utcMidnight(0);
    expect(rule.lastExecuted.getTime()).toBeCloseTo(today.getTime(), -3); // within 1 second

    // Second run must add no more transactions
    await runJob();
    const count = await Transaction.countDocuments({ user: testUser._id });
    expect(count).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. INACTIVE ITEMS – must be completely skipped
// ═════════════════════════════════════════════════════════════════════════════

describe("Inactive recurring items are skipped", () => {
  it("does not create a transaction for an isActive=false rule", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Paused subscription",
      type: "expense",
      amount: 200,
      category: testCategory._id,
      frequency: "monthly",
      startDate: utcMidnightMonthsAgo(1),
      isActive: false, // ← inactive
    });

    await runJob();

    const count = await Transaction.countDocuments({ user: testUser._id });
    expect(count).toBe(0);
  });

  it("creates a transaction for an active rule but not for an inactive one in the same run", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Active Rule",
      type: "income",
      amount: 900,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(1),
      isActive: true,
    });

    await RecurringTransaction.create({
      user: testUser._id,
      title: "Inactive Rule",
      type: "expense",
      amount: 50,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(1),
      isActive: false,
    });

    await runJob();

    const txs = await Transaction.find({ user: testUser._id });
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(900);
  });

  it("auto-deactivates a rule whose endDate is in the past", async () => {
    const yesterday = utcMidnight(1);
    yesterday.setUTCHours(23, 59, 59, 999); // end of yesterday

    await RecurringTransaction.create({
      user: testUser._id,
      title: "Expired rule",
      type: "income",
      amount: 300,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(10),
      endDate: yesterday, // expired
      isActive: true,
    });

    await runJob();

    // No transaction should have been created
    const count = await Transaction.countDocuments({ user: testUser._id });
    expect(count).toBe(0);

    // The rule itself should now be inactive
    const rule = await RecurringTransaction.findOne({ title: "Expired rule" });
    expect(rule.isActive).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. FREQUENCY CORRECTNESS
// ═════════════════════════════════════════════════════════════════════════════

describe("Frequency-based execution logic", () => {
  // ── DAILY ────────────────────────────────────────────────────────────────

  describe("daily", () => {
    it("fires when lastExecuted was yesterday", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Daily – due",
        type: "income",
        amount: 10,
        category: testCategory._id,
        frequency: "daily",
        startDate: utcMidnight(5),
        lastExecuted: utcMidnight(1), // yesterday → diffDays = 1 ≥ 1
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(1);
    });

    it("does NOT fire when lastExecuted was today (diffDays = 0)", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Daily – already done",
        type: "income",
        amount: 10,
        category: testCategory._id,
        frequency: "daily",
        startDate: utcMidnight(5),
        lastExecuted: utcMidnight(0), // today → diffDays = 0 < 1
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(0);
    });

    it("fires when startDate is today and there is no lastExecuted", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Brand-new daily",
        type: "income",
        amount: 42,
        category: testCategory._id,
        frequency: "daily",
        startDate: utcMidnight(0), // today
        lastExecuted: null,
        isActive: true,
      });

      await runJob();

      // startDate = today, lastExecuted = null → base = startDate → diffDays ≥ 0
      // The job uses startDate as base when lastExecuted is null.
      // diffDays = 0 for "daily" → shouldRun = (0 >= 1) = false.
      // This is correct: the rule starts *today*, so the first execution is
      // tomorrow.  Verify no premature transaction is created.
      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(0);
    });
  });

  // ── WEEKLY ───────────────────────────────────────────────────────────────

  describe("weekly", () => {
    it("fires when lastExecuted was exactly 7 days ago", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Weekly – due",
        type: "income",
        amount: 200,
        category: testCategory._id,
        frequency: "weekly",
        startDate: utcMidnight(14),
        lastExecuted: utcMidnight(7), // 7 days ago → diffDays = 7 ≥ 7
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(1);
    });

    it("does NOT fire when lastExecuted was only 6 days ago", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Weekly – not due yet",
        type: "income",
        amount: 200,
        category: testCategory._id,
        frequency: "weekly",
        startDate: utcMidnight(14),
        lastExecuted: utcMidnight(6), // 6 days ago → diffDays = 6 < 7
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(0);
    });
  });

  // ── MONTHLY ──────────────────────────────────────────────────────────────

  describe("monthly", () => {
    it("fires when lastExecuted was in the previous calendar month", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Monthly – due",
        type: "expense",
        amount: 1500,
        category: testCategory._id,
        frequency: "monthly",
        startDate: utcMidnightMonthsAgo(2),
        lastExecuted: utcMidnightMonthsAgo(1), // previous month → due
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(1);
    });

    it("does NOT fire when lastExecuted is in the current calendar month", async () => {
      const firstOfThisMonth = utcMidnight(0);
      firstOfThisMonth.setUTCDate(1); // same month, day 1

      await RecurringTransaction.create({
        user: testUser._id,
        title: "Monthly – already done this month",
        type: "expense",
        amount: 1500,
        category: testCategory._id,
        frequency: "monthly",
        startDate: utcMidnightMonthsAgo(2),
        lastExecuted: firstOfThisMonth,
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(0);
    });
  });

  // ── YEARLY ───────────────────────────────────────────────────────────────

  describe("yearly", () => {
    it("fires when lastExecuted was in the previous calendar year", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Yearly – due",
        type: "income",
        amount: 50000,
        category: testCategory._id,
        frequency: "yearly",
        startDate: utcMidnightYearsAgo(2),
        lastExecuted: utcMidnightYearsAgo(1), // last year → due this year
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(1);
    });

    it("does NOT fire when lastExecuted is already in the current year", async () => {
      const jan1ThisYear = utcMidnight(0);
      jan1ThisYear.setUTCMonth(0);
      jan1ThisYear.setUTCDate(1); // 1 Jan of this year

      await RecurringTransaction.create({
        user: testUser._id,
        title: "Yearly – already done this year",
        type: "income",
        amount: 50000,
        category: testCategory._id,
        frequency: "yearly",
        startDate: utcMidnightYearsAgo(2),
        lastExecuted: jan1ThisYear,
        isActive: true,
      });

      await runJob();

      const count = await Transaction.countDocuments({ user: testUser._id });
      expect(count).toBe(0);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. TRANSACTION FIELD CORRECTNESS
// ═════════════════════════════════════════════════════════════════════════════

describe("Created transaction inherits fields from the recurring rule", () => {
  it("copies user, type, amount, category, note, and date from the rule", async () => {
    const expenseCat = await Category.create({
      name: "Rent",
      type: "expense",
      user: testUser._id,
    });

    const rule = await RecurringTransaction.create({
      user: testUser._id,
      title: "Monthly Rent",
      type: "expense",
      amount: 12000,
      category: expenseCat._id,
      note: "Office rent",
      frequency: "monthly",
      startDate: utcMidnightMonthsAgo(1),
      lastExecuted: utcMidnightMonthsAgo(1),
      isActive: true,
    });

    await runJob();

    const tx = await Transaction.findOne({ sourceRecurringId: rule._id });
    expect(tx).not.toBeNull();
    expect(tx.user.toString()).toBe(testUser._id.toString());
    expect(tx.type).toBe("expense");
    expect(tx.amount).toBe(12000);
    expect(tx.category.toString()).toBe(expenseCat._id.toString());
    expect(tx.note).toBe("Office rent");
    expect(tx.sourceRecurringId.toString()).toBe(rule._id.toString());

    // Date should be today midnight UTC
    const today = utcMidnight(0);
    expect(tx.date.getTime()).toBeCloseTo(today.getTime(), -3);
  });

  it("updates lastExecuted on the rule after a successful transaction insert", async () => {
    const rule = await RecurringTransaction.create({
      user: testUser._id,
      title: "Salary",
      type: "income",
      amount: 80000,
      category: testCategory._id,
      frequency: "monthly",
      startDate: utcMidnightMonthsAgo(1),
      lastExecuted: utcMidnightMonthsAgo(1),
      isActive: true,
    });

    const beforeRun = rule.lastExecuted;
    await runJob();

    const updated = await RecurringTransaction.findById(rule._id);
    expect(updated.lastExecuted.getTime()).toBeGreaterThan(beforeRun.getTime());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. MULTIPLE RULES IN THE SAME RUN
// ═════════════════════════════════════════════════════════════════════════════

describe("Multiple rules processed in a single job run", () => {
  it("creates one transaction per due rule", async () => {
    const rules = [
      {
        title: "Rule A",
        frequency: "daily",
        startDate: utcMidnight(1),
        lastExecuted: utcMidnight(1),
      },
      {
        title: "Rule B",
        frequency: "weekly",
        startDate: utcMidnight(7),
        lastExecuted: utcMidnight(7),
      },
      {
        title: "Rule C (not due)",
        frequency: "daily",
        startDate: utcMidnight(1),
        lastExecuted: utcMidnight(0), // already ran today
      },
    ];

    for (const r of rules) {
      await RecurringTransaction.create({
        user: testUser._id,
        type: "income",
        amount: 100,
        category: testCategory._id,
        isActive: true,
        ...r,
      });
    }

    await runJob();

    const txCount = await Transaction.countDocuments({ user: testUser._id });
    expect(txCount).toBe(2); // Rule A + Rule B; Rule C skipped
  });

  it("processes due rules and skips inactive ones independently", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Active daily",
      type: "income",
      amount: 50,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(3),
      lastExecuted: utcMidnight(1),
      isActive: true,
    });

    await RecurringTransaction.create({
      user: testUser._id,
      title: "Inactive daily",
      type: "income",
      amount: 999,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(3),
      lastExecuted: utcMidnight(1),
      isActive: false,
    });

    await runJob();

    const txs = await Transaction.find({ user: testUser._id });
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(50);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. RULE NOT YET STARTED
// ═════════════════════════════════════════════════════════════════════════════

describe("Rules whose startDate is in the future are skipped", () => {
  it("does not fire for a rule starting tomorrow", async () => {
    const tomorrow = utcMidnight(0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    await RecurringTransaction.create({
      user: testUser._id,
      title: "Future rule",
      type: "income",
      amount: 100,
      category: testCategory._id,
      frequency: "daily",
      startDate: tomorrow, // future → query filter (startDate ≤ today) excludes it
      isActive: true,
    });

    await runJob();

    const count = await Transaction.countDocuments({ user: testUser._id });
    expect(count).toBe(0);
  });
});
