// ─── Mock rate limiter before any app module is loaded ───────────────────────
jest.mock("express-rate-limit", () => () => (_req, _res, next) => next());

// ─── Environment variables (must precede app import) ─────────────────────────
process.env.JWT_ACCESS_SECRET = "test_access_secret_must_be_32_plus_chars_ok";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_plus_chars_ok_xxxxx";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:5173";

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import app from "../src/app.js";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import Transaction from "../src/models/Transaction.js";
import { generateAccessToken } from "../src/utils/generateToken.js";

// ═══════════════════════════════════════════════════════════════════════════
// Fixture constants — single source of truth
// ═══════════════════════════════════════════════════════════════════════════

// ── UTC timestamps ──────────────────────────────────────────────────────────
const JAN_15 = new Date("2024-01-15T12:00:00.000Z");
const JAN_20 = new Date("2024-01-20T12:00:00.000Z");
const JAN_25 = new Date("2024-01-25T12:00:00.000Z");
const JAN_31_END = new Date("2024-01-31T23:59:59.999Z"); // last ms of January
const FEB_1_START = new Date("2024-02-01T00:00:00.000Z"); // first ms of February
const FEB_10 = new Date("2024-02-10T12:00:00.000Z");
const FEB_15 = new Date("2024-02-15T12:00:00.000Z");
const FEB_20 = new Date("2024-02-20T12:00:00.000Z");

// ── Transaction amounts ─────────────────────────────────────────────────────
const SALARY_JAN = 50_000;
const FOOD_JAN = 3_000;
const TRANSPORT_JAN = 1_000;
const BOUNDARY_JAN_INC = 100; // last ms of January → income

const SALARY_FEB = 50_000;
const FREELANCE_FEB = 10_000;
const FOOD_FEB = 5_000;
const BOUNDARY_FEB_EXP = 200; // first ms of February → expense

// ── Derived totals (compute once, assert everywhere) ───────────────────────
const JAN_INCOME = SALARY_JAN + BOUNDARY_JAN_INC; // 50 100
const JAN_EXPENSE = FOOD_JAN + TRANSPORT_JAN; //  4 000
const JAN_BALANCE = JAN_INCOME - JAN_EXPENSE; // 46 100

const FEB_INCOME = SALARY_FEB + FREELANCE_FEB; // 60 000
const FEB_EXPENSE = FOOD_FEB + BOUNDARY_FEB_EXP; //  5 200
const FEB_BALANCE = FEB_INCOME - FEB_EXPENSE; // 54 800

const TOTAL_INCOME = JAN_INCOME + FEB_INCOME; // 110 100
const TOTAL_EXPENSE = JAN_EXPENSE + FEB_EXPENSE; //   9 200
const TOTAL_BALANCE = TOTAL_INCOME - TOTAL_EXPENSE; // 100 900
const TOTAL_TX_COUNT = 8;

// ── Category breakdown totals ───────────────────────────────────────────────
const CAT_FOOD_TOTAL = FOOD_JAN + FOOD_FEB + BOUNDARY_FEB_EXP; //  8 200
const CAT_TRANSPORT_TOTAL = TRANSPORT_JAN; //  1 000
const CAT_SALARY_TOTAL = SALARY_JAN + BOUNDARY_JAN_INC + SALARY_FEB; // 100 100
const CAT_FREELANCE_TOTAL = FREELANCE_FEB; // 10 000

// ═══════════════════════════════════════════════════════════════════════════
// Database lifecycle
// ═══════════════════════════════════════════════════════════════════════════

let mongoServer;
let accessToken;

// Category ObjectIds (needed for assertions and seeding)
let catSalary, catFreelance, catFood, catTransport;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // ── Create user ────────────────────────────────────────────────────────────
  const user = await User.create({
    name: "Analytics Tester",
    email: "analytics@test.example.com",
    password: "Password123!",
  });

  accessToken = generateAccessToken(user._id);

  // ── Create categories ──────────────────────────────────────────────────────
  [catSalary, catFreelance, catFood, catTransport] = await Category.insertMany([
    { name: "Salary", type: "income", user: user._id },
    { name: "Freelance", type: "income", user: user._id },
    { name: "Food", type: "expense", user: user._id },
    { name: "Transport", type: "expense", user: user._id },
  ]);

  // ── Seed transactions (all dates in 2024 — safely in the past) ────────────
  await Transaction.insertMany([
    // January 2024 ─────────────────────────────────────────────────────────
    {
      user: user._id,
      type: "income",
      amount: SALARY_JAN,
      category: catSalary._id,
      date: JAN_15,
      note: "jan-salary",
    },
    {
      user: user._id,
      type: "expense",
      amount: FOOD_JAN,
      category: catFood._id,
      date: JAN_20,
      note: "jan-food",
    },
    {
      user: user._id,
      type: "expense",
      amount: TRANSPORT_JAN,
      category: catTransport._id,
      date: JAN_25,
      note: "jan-transport",
    },
    // UTC boundary: very last millisecond of January → must land in Jan
    {
      user: user._id,
      type: "income",
      amount: BOUNDARY_JAN_INC,
      category: catSalary._id,
      date: JAN_31_END,
      note: "boundary-jan-last-ms",
    },

    // February 2024 ────────────────────────────────────────────────────────
    {
      user: user._id,
      type: "income",
      amount: SALARY_FEB,
      category: catSalary._id,
      date: FEB_10,
      note: "feb-salary",
    },
    {
      user: user._id,
      type: "income",
      amount: FREELANCE_FEB,
      category: catFreelance._id,
      date: FEB_15,
      note: "feb-freelance",
    },
    {
      user: user._id,
      type: "expense",
      amount: FOOD_FEB,
      category: catFood._id,
      date: FEB_20,
      note: "feb-food",
    },
    // UTC boundary: very first millisecond of February → must land in Feb
    {
      user: user._id,
      type: "expense",
      amount: BOUNDARY_FEB_EXP,
      category: catFood._id,
      date: FEB_1_START,
      note: "boundary-feb-first-ms",
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ─── Request helper ───────────────────────────────────────────────────────────
const get = (path) =>
  request(app).get(path).set("Authorization", `Bearer ${accessToken}`);

// ═══════════════════════════════════════════════════════════════════════════
// 1.  GET /api/analytics/monthly — monthly totals
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/analytics/monthly — monthly totals", () => {
  // ── January ───────────────────────────────────────────────────────────────
  describe("January 2024", () => {
    let body;

    beforeAll(async () => {
      const res = await get("/api/analytics/monthly?month=1&year=2024");
      body = res.body;
    });

    it("responds with HTTP 200", async () => {
      const res = await get("/api/analytics/monthly?month=1&year=2024");
      expect(res.status).toBe(200);
    });

    it(`income = ${JAN_INCOME} (salary + boundary tx)`, () => {
      expect(body.income).toBe(JAN_INCOME);
    });

    it(`expense = ${JAN_EXPENSE} (food + transport)`, () => {
      expect(body.expense).toBe(JAN_EXPENSE);
    });

    it(`balance = ${JAN_BALANCE} (income – expense)`, () => {
      expect(body.balance).toBe(JAN_BALANCE);
    });
  });

  // ── February ──────────────────────────────────────────────────────────────
  describe("February 2024", () => {
    let body;

    beforeAll(async () => {
      const res = await get("/api/analytics/monthly?month=2&year=2024");
      body = res.body;
    });

    it(`income = ${FEB_INCOME} (salary + freelance)`, () => {
      expect(body.income).toBe(FEB_INCOME);
    });

    it(`expense = ${FEB_EXPENSE} (food + boundary tx)`, () => {
      expect(body.expense).toBe(FEB_EXPENSE);
    });

    it(`balance = ${FEB_BALANCE}`, () => {
      expect(body.balance).toBe(FEB_BALANCE);
    });
  });

  // ── Empty month ───────────────────────────────────────────────────────────
  describe("March 2024 (no transactions)", () => {
    let body;

    beforeAll(async () => {
      const res = await get("/api/analytics/monthly?month=3&year=2024");
      body = res.body;
    });

    it("income is 0", () => expect(body.income).toBe(0));
    it("expense is 0", () => expect(body.expense).toBe(0));
    it("balance is 0", () => expect(body.balance).toBe(0));
  });

  // ── Validation ────────────────────────────────────────────────────────────
  describe("validation", () => {
    it("returns 400 when month param is missing", async () => {
      const res = await get("/api/analytics/monthly?year=2024");
      expect(res.status).toBe(400);
    });

    it("returns 400 when year param is missing", async () => {
      const res = await get("/api/analytics/monthly?month=1");
      expect(res.status).toBe(400);
    });

    it("returns 400 when month is out of range (0)", async () => {
      const res = await get("/api/analytics/monthly?month=0&year=2024");
      expect(res.status).toBe(400);
    });

    it("returns 400 when month is out of range (13)", async () => {
      const res = await get("/api/analytics/monthly?month=13&year=2024");
      expect(res.status).toBe(400);
    });

    it("returns 401 without Authorization header", async () => {
      const res = await request(app).get(
        "/api/analytics/monthly?month=1&year=2024",
      );
      expect(res.status).toBe(401);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2.  GET /api/analytics/overview — all-time income / expense totals
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/analytics/overview — all-time income & expense totals", () => {
  let body;

  beforeAll(async () => {
    const res = await get("/api/analytics/overview");
    expect(res.status).toBe(200);
    body = res.body;
  });

  it(`totalIncome = ${TOTAL_INCOME}`, () => {
    expect(body.totalIncome).toBe(TOTAL_INCOME);
  });

  it(`totalExpense = ${TOTAL_EXPENSE}`, () => {
    expect(body.totalExpense).toBe(TOTAL_EXPENSE);
  });

  it(`balance = ${TOTAL_BALANCE} (totalIncome – totalExpense)`, () => {
    expect(body.balance).toBe(TOTAL_BALANCE);
  });

  it(`transactionsCount = ${TOTAL_TX_COUNT}`, () => {
    expect(body.transactionsCount).toBe(TOTAL_TX_COUNT);
  });

  it("returns 401 without Authorization header", async () => {
    const res = await request(app).get("/api/analytics/overview");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3.  GET /api/analytics/categories — category breakdown
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/analytics/categories — category breakdown", () => {
  // ── Expense breakdown ─────────────────────────────────────────────────────
  describe("type=expense (all-time)", () => {
    let items;

    beforeAll(async () => {
      const res = await get("/api/analytics/categories?type=expense");
      expect(res.status).toBe(200);
      items = res.body;
    });

    const findCat = (items, name) =>
      items.find((i) => i.category === name) ?? { total: 0 };

    it("returns an array", () => {
      expect(Array.isArray(items)).toBe(true);
    });

    it(`Food total = ${CAT_FOOD_TOTAL}`, () => {
      expect(findCat(items, "Food").total).toBe(CAT_FOOD_TOTAL);
    });

    it(`Transport total = ${CAT_TRANSPORT_TOTAL}`, () => {
      expect(findCat(items, "Transport").total).toBe(CAT_TRANSPORT_TOTAL);
    });

    it("does not include income categories", () => {
      const names = items.map((i) => i.category);
      expect(names).not.toContain("Salary");
      expect(names).not.toContain("Freelance");
    });

    it("is sorted descending by total (highest first)", () => {
      const totals = items.map((i) => i.total);
      const sorted = [...totals].sort((a, b) => b - a);
      expect(totals).toEqual(sorted);
    });

    it("grand total of all items equals TOTAL_EXPENSE", () => {
      const sum = items.reduce((s, i) => s + i.total, 0);
      expect(sum).toBe(TOTAL_EXPENSE);
    });
  });

  // ── Income breakdown ──────────────────────────────────────────────────────
  describe("type=income (all-time)", () => {
    let items;

    beforeAll(async () => {
      const res = await get("/api/analytics/categories?type=income");
      expect(res.status).toBe(200);
      items = res.body;
    });

    const findCat = (items, name) =>
      items.find((i) => i.category === name) ?? { total: 0 };

    it(`Salary total = ${CAT_SALARY_TOTAL}`, () => {
      expect(findCat(items, "Salary").total).toBe(CAT_SALARY_TOTAL);
    });

    it(`Freelance total = ${CAT_FREELANCE_TOTAL}`, () => {
      expect(findCat(items, "Freelance").total).toBe(CAT_FREELANCE_TOTAL);
    });

    it("does not include expense categories", () => {
      const names = items.map((i) => i.category);
      expect(names).not.toContain("Food");
      expect(names).not.toContain("Transport");
    });

    it("grand total of all items equals TOTAL_INCOME", () => {
      const sum = items.reduce((s, i) => s + i.total, 0);
      expect(sum).toBe(TOTAL_INCOME);
    });
  });

  // ── Month-scoped breakdown ────────────────────────────────────────────────
  describe("type=expense, month=1, year=2024 (January only)", () => {
    let items;

    beforeAll(async () => {
      const res = await get(
        "/api/analytics/categories?type=expense&month=1&year=2024",
      );
      expect(res.status).toBe(200);
      items = res.body;
    });

    const findCat = (items, name) =>
      items.find((i) => i.category === name) ?? { total: 0 };

    it(`Food total for Jan = ${FOOD_JAN}`, () => {
      expect(findCat(items, "Food").total).toBe(FOOD_JAN);
    });

    it(`Transport total for Jan = ${TRANSPORT_JAN}`, () => {
      expect(findCat(items, "Transport").total).toBe(TRANSPORT_JAN);
    });

    it("grand total equals JAN_EXPENSE", () => {
      const sum = items.reduce((s, i) => s + i.total, 0);
      expect(sum).toBe(JAN_EXPENSE);
    });
  });

  describe("type=expense, month=2, year=2024 (February only)", () => {
    let items;

    beforeAll(async () => {
      const res = await get(
        "/api/analytics/categories?type=expense&month=2&year=2024",
      );
      expect(res.status).toBe(200);
      items = res.body;
    });

    it("grand total equals FEB_EXPENSE (includes boundary tx)", () => {
      const sum = items.reduce((s, i) => s + i.total, 0);
      expect(sum).toBe(FEB_EXPENSE);
    });

    it("does not include Transport (no transport in Feb)", () => {
      const names = items.map((i) => i.category);
      expect(names).not.toContain("Transport");
    });
  });

  // ── Validation ────────────────────────────────────────────────────────────
  describe("validation", () => {
    it("returns 400 when type param is missing", async () => {
      const res = await get("/api/analytics/categories");
      expect(res.status).toBe(400);
    });

    it("returns 400 when type is not income or expense", async () => {
      const res = await get("/api/analytics/categories?type=other");
      expect(res.status).toBe(400);
    });

    it("returns 401 without Authorization header", async () => {
      const res = await request(app).get(
        "/api/analytics/categories?type=expense",
      );
      expect(res.status).toBe(401);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4.  GET /api/analytics/trend — monthly trend data
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/analytics/trend — monthly trend", () => {
  let rawItems;

  // Helper: sum totals for a specific (month, type) pair
  const sumFor = (month, type) =>
    rawItems
      .filter((i) => i.month === month && i.type === type)
      .reduce((s, i) => s + i.total, 0);

  beforeAll(async () => {
    const res = await get("/api/analytics/trend?year=2024");
    expect(res.status).toBe(200);
    rawItems = res.body; // [{ month, type, total }, ...]
  });

  it("returns an array of objects with month/type/total shape", () => {
    expect(Array.isArray(rawItems)).toBe(true);
    rawItems.forEach((item) => {
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("total");
    });
  });

  it(`month=1 income = ${JAN_INCOME}`, () => {
    expect(sumFor(1, "income")).toBe(JAN_INCOME);
  });

  it(`month=1 expense = ${JAN_EXPENSE}`, () => {
    expect(sumFor(1, "expense")).toBe(JAN_EXPENSE);
  });

  it(`month=2 income = ${FEB_INCOME}`, () => {
    expect(sumFor(2, "income")).toBe(FEB_INCOME);
  });

  it(`month=2 expense = ${FEB_EXPENSE}`, () => {
    expect(sumFor(2, "expense")).toBe(FEB_EXPENSE);
  });

  it("months 3–12 have no entries (no transactions seeded)", () => {
    for (let m = 3; m <= 12; m++) {
      expect(sumFor(m, "income")).toBe(0);
      expect(sumFor(m, "expense")).toBe(0);
    }
  });

  it("sum of all income entries equals TOTAL_INCOME", () => {
    const totalInc = rawItems
      .filter((i) => i.type === "income")
      .reduce((s, i) => s + i.total, 0);
    expect(totalInc).toBe(TOTAL_INCOME);
  });

  it("sum of all expense entries equals TOTAL_EXPENSE", () => {
    const totalExp = rawItems
      .filter((i) => i.type === "expense")
      .reduce((s, i) => s + i.total, 0);
    expect(totalExp).toBe(TOTAL_EXPENSE);
  });

  // ── Validation ─────────────────────────────────────────────────────────
  it("returns 400 when year param is missing", async () => {
    const res = await get("/api/analytics/trend");
    expect(res.status).toBe(400);
  });

  it("returns 401 without Authorization header", async () => {
    const res = await request(app).get("/api/analytics/trend?year=2024");
    expect(res.status).toBe(401);
  });

  it("returns an empty array for a year with no transactions", async () => {
    const res = await get("/api/analytics/trend?year=2000");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5.  UTC boundary correctness
// ═══════════════════════════════════════════════════════════════════════════

describe("UTC boundary correctness", () => {
  /**
   * The service builds month windows with:
   *   startDate = Date.UTC(year, month - 1, 1)           → inclusive
   *   endDate   = Date.UTC(year, month, 0, 23, 59, 59, 999) → inclusive
   *
   * We seeded:
   *   JAN_31_END  = 2024-01-31T23:59:59.999Z  → must appear in January
   *   FEB_1_START = 2024-02-01T00:00:00.000Z  → must appear in February
   */

  it("2024-01-31T23:59:59.999Z (last ms of January) is counted in January income", async () => {
    const res = await get("/api/analytics/monthly?month=1&year=2024");
    // Without boundary tx, Jan income would be SALARY_JAN = 50 000.
    // With it: 50 000 + BOUNDARY_JAN_INC = JAN_INCOME.
    expect(res.body.income).toBe(JAN_INCOME);
  });

  it("2024-01-31T23:59:59.999Z is NOT counted in February income", async () => {
    const res = await get("/api/analytics/monthly?month=2&year=2024");
    // February income must be exactly SALARY_FEB + FREELANCE_FEB,
    // with no bleed from the January boundary tx.
    expect(res.body.income).toBe(FEB_INCOME);
  });

  it("2024-02-01T00:00:00.000Z (first ms of February) is counted in February expense", async () => {
    const res = await get("/api/analytics/monthly?month=2&year=2024");
    // Without boundary tx, Feb expense = FOOD_FEB = 5 000.
    // With it: 5 000 + BOUNDARY_FEB_EXP = FEB_EXPENSE.
    expect(res.body.expense).toBe(FEB_EXPENSE);
  });

  it("2024-02-01T00:00:00.000Z is NOT counted in January expense", async () => {
    const res = await get("/api/analytics/monthly?month=1&year=2024");
    // January expense must be exactly FOOD_JAN + TRANSPORT_JAN,
    // with no bleed from the February boundary tx.
    expect(res.body.expense).toBe(JAN_EXPENSE);
  });

  it("trend month=1 income includes boundary tx (Jan 31 last ms)", async () => {
    const res = await get("/api/analytics/trend?year=2024");
    const jan = res.body
      .filter((i) => i.month === 1 && i.type === "income")
      .reduce((s, i) => s + i.total, 0);
    expect(jan).toBe(JAN_INCOME);
  });

  it("trend month=2 expense includes boundary tx (Feb 1 first ms)", async () => {
    const res = await get("/api/analytics/trend?year=2024");
    const feb = res.body
      .filter((i) => i.month === 2 && i.type === "expense")
      .reduce((s, i) => s + i.total, 0);
    expect(feb).toBe(FEB_EXPENSE);
  });

  it("overall: all 8 boundary-aware transactions sum to TOTAL_INCOME + TOTAL_EXPENSE", async () => {
    const res = await get("/api/analytics/overview");
    expect(res.body.totalIncome).toBe(TOTAL_INCOME);
    expect(res.body.totalExpense).toBe(TOTAL_EXPENSE);
    expect(res.body.transactionsCount).toBe(TOTAL_TX_COUNT);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6.  Data-isolation guard — another user's transactions must not appear
// ═══════════════════════════════════════════════════════════════════════════

describe("Data isolation — no cross-user data leakage", () => {
  let otherToken;

  beforeAll(async () => {
    // Create a second user with their own transaction
    const other = await User.create({
      name: "Other User",
      email: "other@analytics.test",
      password: "OtherPass1!",
    });
    otherToken = generateAccessToken(other._id);

    // This category and transaction belong solely to the other user
    const otherCat = await Category.create({
      name: "OtherCat",
      type: "expense",
      user: other._id,
    });
    await Transaction.create({
      user: other._id,
      type: "expense",
      amount: 999_999,
      category: otherCat._id,
      date: JAN_15,
      note: "other-user-tx",
    });
  });

  it("overview totals for the first user are unaffected by second user's tx", async () => {
    const res = await get("/api/analytics/overview");
    expect(res.status).toBe(200);
    // Still exactly our computed totals — not inflated by the other user's 999 999
    expect(res.body.totalExpense).toBe(TOTAL_EXPENSE);
    expect(res.body.totalIncome).toBe(TOTAL_INCOME);
    expect(res.body.transactionsCount).toBe(TOTAL_TX_COUNT);
  });

  it("second user's overview shows only their own transaction", async () => {
    const res = await request(app)
      .get("/api/analytics/overview")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalExpense).toBe(999_999);
    expect(res.body.totalIncome).toBe(0);
    expect(res.body.transactionsCount).toBe(1);
  });

  it("monthly summary for first user excludes other user's data", async () => {
    const res = await get("/api/analytics/monthly?month=1&year=2024");
    expect(res.body.expense).toBe(JAN_EXPENSE); // unchanged
  });
});
