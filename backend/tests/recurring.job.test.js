let capturedCronCallback = null;

jest.mock("node-cron", () => ({
  schedule: jest.fn((_expression, callback) => {
    capturedCronCallback = callback;
  }),
}));

process.env.JWT_ACCESS_SECRET = "test_access_secret_must_be_32_plus_chars_ok";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_plus_chars_ok_xxxxx";
process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { startRecurringJob } from "../src/jobs/recurring.job.js";
import RecurringTransaction from "../src/models/RecurringTransaction.js";
import Transaction from "../src/models/Transaction.js";
import Category from "../src/models/Category.js";
import User from "../src/models/User.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const utcMidnight = (daysAgo = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
};

const utcMidnightMonthsAgo = (monthsAgo) => {
  const d = utcMidnight(0);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d;
};

const utcMidnightYearsAgo = (yearsAgo) => {
  const d = utcMidnight(0);
  d.setUTCFullYear(d.getUTCFullYear() - yearsAgo);
  return d;
};

const runJob = async () => {
  if (!capturedCronCallback) throw new Error("Cron callback not captured.");
  await capturedCronCallback();
};

// ─── DB lifecycle ─────────────────────────────────────────────────────────────

let mongoServer;
let testUser;
let testCategory;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  startRecurringJob();
  expect(capturedCronCallback).not.toBeNull();

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

afterEach(async () => {
  await RecurringTransaction.deleteMany({});
  await Transaction.deleteMany({});
  // Clean up job lock between tests
  const JobLock = mongoose.models.JobLock;
  if (JobLock) await JobLock.deleteMany({});
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════

describe("Idempotency — no duplicate transactions", () => {
  it("creates exactly one transaction even when the job fires twice", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Daily salary",
      type: "income",
      amount: 500,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(1),
      isActive: true,
    });

    await runJob();
    expect(await Transaction.countDocuments({ user: testUser._id })).toBe(1);

    // Clean the lock so second run can acquire it
    const JobLock = mongoose.models.JobLock;
    if (JobLock) await JobLock.deleteMany({});

    await runJob();
    // Idempotency index must block second insert
    expect(await Transaction.countDocuments({ user: testUser._id })).toBe(1);
  });

  it("stores sourceRecurringId on generated transaction", async () => {
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

  it("updates lastExecuted after first run", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Weekly rule",
      type: "income",
      amount: 1000,
      category: testCategory._id,
      frequency: "weekly",
      startDate: utcMidnight(7),
      isActive: true,
    });

    await runJob();

    const rule = await RecurringTransaction.findOne({ user: testUser._id });
    const today = utcMidnight(0);
    expect(rule.lastExecuted.getTime()).toBeCloseTo(today.getTime(), -3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. INACTIVE ITEMS
// ═══════════════════════════════════════════════════════════════════════════

describe("Inactive recurring items are skipped", () => {
  it("does not create transaction for isActive=false rule", async () => {
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Paused subscription",
      type: "expense",
      amount: 200,
      category: testCategory._id,
      frequency: "monthly",
      startDate: utcMidnightMonthsAgo(1),
      isActive: false,
    });

    await runJob();
    expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
  });

  it("creates transaction for active rule but skips inactive", async () => {
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

  it("auto-deactivates rule whose endDate is past", async () => {
    const yesterday = utcMidnight(1);
    yesterday.setUTCHours(23, 59, 59, 999);

    await RecurringTransaction.create({
      user: testUser._id,
      title: "Expired rule",
      type: "income",
      amount: 300,
      category: testCategory._id,
      frequency: "daily",
      startDate: utcMidnight(10),
      endDate: yesterday,
      isActive: true,
    });

    await runJob();

    expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
    const rule = await RecurringTransaction.findOne({ title: "Expired rule" });
    expect(rule.isActive).toBe(false);
  });

  it("skips rules whose category was deleted", async () => {
    const tempCat = await Category.create({
      name: "TempCat",
      type: "expense",
      user: testUser._id,
    });
    await RecurringTransaction.create({
      user: testUser._id,
      title: "Orphaned rule",
      type: "expense",
      amount: 100,
      category: tempCat._id,
      frequency: "daily",
      startDate: utcMidnight(1),
      isActive: true,
    });
    // Delete category — rule should be skipped and deactivated
    await Category.findByIdAndDelete(tempCat._id);

    await runJob();

    expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
    const rule = await RecurringTransaction.findOne({ title: "Orphaned rule" });
    expect(rule.isActive).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. FREQUENCY CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════

describe("Frequency-based execution logic", () => {
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
        lastExecuted: utcMidnight(1),
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(1);
    });

    it("does NOT fire when lastExecuted was today", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Daily – done",
        type: "income",
        amount: 10,
        category: testCategory._id,
        frequency: "daily",
        startDate: utcMidnight(5),
        lastExecuted: utcMidnight(0),
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
    });

    it("does NOT fire when startDate is today and no lastExecuted", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Brand-new daily",
        type: "income",
        amount: 42,
        category: testCategory._id,
        frequency: "daily",
        startDate: utcMidnight(0),
        lastExecuted: null,
        isActive: true,
      });
      await runJob();
      // startDate = today, diffDays = 0 < 1 → should NOT fire
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
    });
  });

  describe("weekly", () => {
    it("fires when lastExecuted was 7 days ago", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Weekly – due",
        type: "income",
        amount: 200,
        category: testCategory._id,
        frequency: "weekly",
        startDate: utcMidnight(14),
        lastExecuted: utcMidnight(7),
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(1);
    });

    it("does NOT fire when lastExecuted was only 6 days ago", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Weekly – not due",
        type: "income",
        amount: 200,
        category: testCategory._id,
        frequency: "weekly",
        startDate: utcMidnight(14),
        lastExecuted: utcMidnight(6),
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
    });
  });

  describe("monthly", () => {
    it("fires when lastExecuted was in previous month", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Monthly – due",
        type: "expense",
        amount: 1500,
        category: testCategory._id,
        frequency: "monthly",
        startDate: utcMidnightMonthsAgo(2),
        lastExecuted: utcMidnightMonthsAgo(1),
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(1);
    });

    it("does NOT fire when lastExecuted is in current month", async () => {
      const firstOfThisMonth = utcMidnight(0);
      firstOfThisMonth.setUTCDate(1);
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Monthly – done",
        type: "expense",
        amount: 1500,
        category: testCategory._id,
        frequency: "monthly",
        startDate: utcMidnightMonthsAgo(2),
        lastExecuted: firstOfThisMonth,
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
    });
  });

  describe("yearly", () => {
    it("fires when lastExecuted was in previous year", async () => {
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Yearly – due",
        type: "income",
        amount: 50000,
        category: testCategory._id,
        frequency: "yearly",
        startDate: utcMidnightYearsAgo(2),
        lastExecuted: utcMidnightYearsAgo(1),
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(1);
    });

    it("does NOT fire when lastExecuted is in current year", async () => {
      const jan1 = utcMidnight(0);
      jan1.setUTCMonth(0);
      jan1.setUTCDate(1);
      await RecurringTransaction.create({
        user: testUser._id,
        title: "Yearly – done",
        type: "income",
        amount: 50000,
        category: testCategory._id,
        frequency: "yearly",
        startDate: utcMidnightYearsAgo(2),
        lastExecuted: jan1,
        isActive: true,
      });
      await runJob();
      expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. TRANSACTION FIELD CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════

describe("Created transaction inherits fields from rule", () => {
  it("copies all required fields correctly", async () => {
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

    const today = utcMidnight(0);
    expect(tx.date.getTime()).toBeCloseTo(today.getTime(), -3);
  });

  it("updates lastExecuted on the rule after successful insert", async () => {
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

// ═══════════════════════════════════════════════════════════════════════════
// 5. MULTIPLE RULES
// ═══════════════════════════════════════════════════════════════════════════

describe("Multiple rules in a single run", () => {
  it("creates one transaction per due rule, skips non-due rules", async () => {
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
        lastExecuted: utcMidnight(0),
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
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. FUTURE START DATE
// ═══════════════════════════════════════════════════════════════════════════

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
      startDate: tomorrow,
      isActive: true,
    });

    await runJob();
    expect(await Transaction.countDocuments({ user: testUser._id })).toBe(0);
  });
});
