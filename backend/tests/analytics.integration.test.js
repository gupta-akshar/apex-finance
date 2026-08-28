jest.mock("express-rate-limit", () => () => (_req, _res, next) => next());

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

// ── All timestamps use Date.UTC() to match the fixed analytics service ────────

const JAN_15 = new Date("2024-01-15T12:00:00.000Z");
const JAN_20 = new Date("2024-01-20T12:00:00.000Z");
const JAN_25 = new Date("2024-01-25T12:00:00.000Z");
const JAN_31_END = new Date("2024-01-31T23:59:59.999Z");
const FEB_1_START = new Date("2024-02-01T00:00:00.000Z");
const FEB_10 = new Date("2024-02-10T12:00:00.000Z");
const FEB_15 = new Date("2024-02-15T12:00:00.000Z");
const FEB_20 = new Date("2024-02-20T12:00:00.000Z");

const SALARY_JAN = 50_000;
const FOOD_JAN = 3_000;
const TRANSPORT_JAN = 1_000;
const BOUNDARY_JAN_INC = 100;

const SALARY_FEB = 50_000;
const FREELANCE_FEB = 10_000;
const FOOD_FEB = 5_000;
const BOUNDARY_FEB_EXP = 200;

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

const CAT_FOOD_TOTAL = FOOD_JAN + FOOD_FEB + BOUNDARY_FEB_EXP; //  8 200
const CAT_TRANSPORT_TOTAL = TRANSPORT_JAN; //  1 000
const CAT_SALARY_TOTAL = SALARY_JAN + BOUNDARY_JAN_INC + SALARY_FEB; // 100 100
const CAT_FREELANCE_TOTAL = FREELANCE_FEB; // 10 000

let mongoServer;
let accessToken;
let catSalary, catFreelance, catFood, catTransport;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Ensure all indexes are created so .hint() calls in the service don't fail
  await Transaction.createIndexes();
  await Category.createIndexes();
  await User.createIndexes();

  const user = await User.create({
    name: "Analytics Tester",
    email: "analytics@test.example.com",
    password: "Password123!",
  });
  accessToken = generateAccessToken(user._id);

  [catSalary, catFreelance, catFood, catTransport] = await Category.insertMany([
    { name: "Salary", type: "income", user: user._id },
    { name: "Freelance", type: "income", user: user._id },
    { name: "Food", type: "expense", user: user._id },
    { name: "Transport", type: "expense", user: user._id },
  ]);

  await Transaction.insertMany([
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
    {
      user: user._id,
      type: "income",
      amount: BOUNDARY_JAN_INC,
      category: catSalary._id,
      date: JAN_31_END,
      note: "boundary-jan-last-ms",
    },
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

const get = (path) =>
  request(app).get(path).set("Authorization", `Bearer ${accessToken}`);

// ─── Monthly Summary ──────────────────────────────────────────────────────────

describe("GET /api/analytics/monthly", () => {
  describe("January 2024", () => {
    let body;
    beforeAll(async () => {
      const res = await get("/api/analytics/monthly?month=1&year=2024");
      body = res.body;
    });

    it("returns 200", async () => {
      expect(
        (await get("/api/analytics/monthly?month=1&year=2024")).status,
      ).toBe(200);
    });
    it(`income = ${JAN_INCOME}`, () => {
      expect(body.income).toBe(JAN_INCOME);
    });
    it(`expense = ${JAN_EXPENSE}`, () => {
      expect(body.expense).toBe(JAN_EXPENSE);
    });
    it(`balance = ${JAN_BALANCE}`, () => {
      expect(body.balance).toBe(JAN_BALANCE);
    });
  });

  describe("February 2024", () => {
    let body;
    beforeAll(async () => {
      body = (await get("/api/analytics/monthly?month=2&year=2024")).body;
    });

    it(`income = ${FEB_INCOME}`, () => {
      expect(body.income).toBe(FEB_INCOME);
    });
    it(`expense = ${FEB_EXPENSE}`, () => {
      expect(body.expense).toBe(FEB_EXPENSE);
    });
    it(`balance = ${FEB_BALANCE}`, () => {
      expect(body.balance).toBe(FEB_BALANCE);
    });
  });

  describe("March 2024 (empty)", () => {
    let body;
    beforeAll(async () => {
      body = (await get("/api/analytics/monthly?month=3&year=2024")).body;
    });

    it("income  = 0", () => expect(body.income).toBe(0));
    it("expense = 0", () => expect(body.expense).toBe(0));
    it("balance = 0", () => expect(body.balance).toBe(0));
  });

  describe("validation", () => {
    it("returns 400 without month", async () => {
      expect((await get("/api/analytics/monthly?year=2024")).status).toBe(400);
    });
    it("returns 400 without year", async () => {
      expect((await get("/api/analytics/monthly?month=1")).status).toBe(400);
    });
    it("returns 400 for month=0", async () => {
      expect(
        (await get("/api/analytics/monthly?month=0&year=2024")).status,
      ).toBe(400);
    });
    it("returns 400 for month=13", async () => {
      expect(
        (await get("/api/analytics/monthly?month=13&year=2024")).status,
      ).toBe(400);
    });
    it("returns 401 without token", async () => {
      expect(
        (await request(app).get("/api/analytics/monthly?month=1&year=2024"))
          .status,
      ).toBe(401);
    });
  });
});

// ─── Overview ─────────────────────────────────────────────────────────────────

describe("GET /api/analytics/overview", () => {
  let body;
  beforeAll(async () => {
    body = (await get("/api/analytics/overview")).body;
  });

  it(`totalIncome = ${TOTAL_INCOME}`, () =>
    expect(body.totalIncome).toBe(TOTAL_INCOME));
  it(`totalExpense = ${TOTAL_EXPENSE}`, () =>
    expect(body.totalExpense).toBe(TOTAL_EXPENSE));
  it(`balance = ${TOTAL_BALANCE}`, () =>
    expect(body.balance).toBe(TOTAL_BALANCE));
  it(`transactionsCount = ${TOTAL_TX_COUNT}`, () =>
    expect(body.transactionsCount).toBe(TOTAL_TX_COUNT));
  it("returns 401 without token", async () => {
    expect((await request(app).get("/api/analytics/overview")).status).toBe(
      401,
    );
  });
});

// ─── Category Breakdown ───────────────────────────────────────────────────────

describe("GET /api/analytics/categories", () => {
  const findCat = (items, name) =>
    items.find((i) => i.category === name) ?? { total: 0 };

  describe("type=expense (all-time)", () => {
    let items;
    beforeAll(async () => {
      items = (await get("/api/analytics/categories?type=expense")).body;
    });

    it("returns an array", () => expect(Array.isArray(items)).toBe(true));
    it(`Food total = ${CAT_FOOD_TOTAL}`, () =>
      expect(findCat(items, "Food").total).toBe(CAT_FOOD_TOTAL));
    it(`Transport total = ${CAT_TRANSPORT_TOTAL}`, () =>
      expect(findCat(items, "Transport").total).toBe(CAT_TRANSPORT_TOTAL));
    it("excludes income categories", () => {
      expect(items.map((i) => i.category)).not.toContain("Salary");
    });
    it("is sorted descending by total", () => {
      const totals = items.map((i) => i.total);
      expect(totals).toEqual([...totals].sort((a, b) => b - a));
    });
    it("grand total equals TOTAL_EXPENSE", () => {
      expect(items.reduce((s, i) => s + i.total, 0)).toBe(TOTAL_EXPENSE);
    });
  });

  describe("type=income (all-time)", () => {
    let items;
    beforeAll(async () => {
      items = (await get("/api/analytics/categories?type=income")).body;
    });

    it(`Salary total = ${CAT_SALARY_TOTAL}`, () =>
      expect(findCat(items, "Salary").total).toBe(CAT_SALARY_TOTAL));
    it(`Freelance total = ${CAT_FREELANCE_TOTAL}`, () =>
      expect(findCat(items, "Freelance").total).toBe(CAT_FREELANCE_TOTAL));
    it("excludes expense categories", () => {
      expect(items.map((i) => i.category)).not.toContain("Food");
    });
    it("grand total equals TOTAL_INCOME", () => {
      expect(items.reduce((s, i) => s + i.total, 0)).toBe(TOTAL_INCOME);
    });
  });

  describe("type=expense, month=1, year=2024", () => {
    let items;
    beforeAll(async () => {
      items = (
        await get("/api/analytics/categories?type=expense&month=1&year=2024")
      ).body;
    });

    it(`Food = ${FOOD_JAN}`, () =>
      expect(findCat(items, "Food").total).toBe(FOOD_JAN));
    it(`Transport = ${TRANSPORT_JAN}`, () =>
      expect(findCat(items, "Transport").total).toBe(TRANSPORT_JAN));
    it("grand total equals JAN_EXPENSE", () =>
      expect(items.reduce((s, i) => s + i.total, 0)).toBe(JAN_EXPENSE));
  });

  describe("validation", () => {
    it("returns 400 without type", async () => {
      expect((await get("/api/analytics/categories")).status).toBe(400);
    });
    it("returns 400 for invalid type", async () => {
      expect((await get("/api/analytics/categories?type=other")).status).toBe(
        400,
      );
    });
    it("returns 401 without token", async () => {
      expect(
        (await request(app).get("/api/analytics/categories?type=expense"))
          .status,
      ).toBe(401);
    });
  });
});

// ─── Monthly Trend ────────────────────────────────────────────────────────────

describe("GET /api/analytics/trend", () => {
  let rawItems;

  const sumFor = (month, type) =>
    rawItems
      .filter((i) => i.month === month && i.type === type)
      .reduce((s, i) => s + i.total, 0);

  beforeAll(async () => {
    rawItems = (await get("/api/analytics/trend?year=2024")).body;
  });

  it("returns array of { month, type, total }", () => {
    expect(Array.isArray(rawItems)).toBe(true);
    rawItems.forEach((item) => {
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("total");
    });
  });

  it(`month=1 income = ${JAN_INCOME}`, () =>
    expect(sumFor(1, "income")).toBe(JAN_INCOME));
  it(`month=1 expense = ${JAN_EXPENSE}`, () =>
    expect(sumFor(1, "expense")).toBe(JAN_EXPENSE));
  it(`month=2 income = ${FEB_INCOME}`, () =>
    expect(sumFor(2, "income")).toBe(FEB_INCOME));
  it(`month=2 expense = ${FEB_EXPENSE}`, () =>
    expect(sumFor(2, "expense")).toBe(FEB_EXPENSE));

  it("months 3–12 have no entries", () => {
    for (let m = 3; m <= 12; m++) {
      expect(sumFor(m, "income")).toBe(0);
      expect(sumFor(m, "expense")).toBe(0);
    }
  });

  it("sum of all income equals TOTAL_INCOME", () => {
    expect(
      rawItems
        .filter((i) => i.type === "income")
        .reduce((s, i) => s + i.total, 0),
    ).toBe(TOTAL_INCOME);
  });
  it("sum of all expense equals TOTAL_EXPENSE", () => {
    expect(
      rawItems
        .filter((i) => i.type === "expense")
        .reduce((s, i) => s + i.total, 0),
    ).toBe(TOTAL_EXPENSE);
  });

  it("returns 400 without year", async () => {
    expect((await get("/api/analytics/trend")).status).toBe(400);
  });
  it("returns 401 without token", async () => {
    expect(
      (await request(app).get("/api/analytics/trend?year=2024")).status,
    ).toBe(401);
  });
  it("returns empty array for empty year", async () => {
    expect((await get("/api/analytics/trend?year=2000")).body).toEqual([]);
  });
});

// ─── UTC boundary correctness ─────────────────────────────────────────────────

describe("UTC boundary correctness", () => {
  it("Jan 31 23:59:59.999Z is counted in January income", async () => {
    expect(
      (await get("/api/analytics/monthly?month=1&year=2024")).body.income,
    ).toBe(JAN_INCOME);
  });
  it("Jan 31 23:59:59.999Z is NOT counted in February income", async () => {
    expect(
      (await get("/api/analytics/monthly?month=2&year=2024")).body.income,
    ).toBe(FEB_INCOME);
  });
  it("Feb 1 00:00:00.000Z is counted in February expense", async () => {
    expect(
      (await get("/api/analytics/monthly?month=2&year=2024")).body.expense,
    ).toBe(FEB_EXPENSE);
  });
  it("Feb 1 00:00:00.000Z is NOT counted in January expense", async () => {
    expect(
      (await get("/api/analytics/monthly?month=1&year=2024")).body.expense,
    ).toBe(JAN_EXPENSE);
  });
  it("trend month=1 income includes boundary tx", async () => {
    const res = await get("/api/analytics/trend?year=2024");
    const jan = res.body
      .filter((i) => i.month === 1 && i.type === "income")
      .reduce((s, i) => s + i.total, 0);
    expect(jan).toBe(JAN_INCOME);
  });
  it("trend month=2 expense includes boundary tx", async () => {
    const res = await get("/api/analytics/trend?year=2024");
    const feb = res.body
      .filter((i) => i.month === 2 && i.type === "expense")
      .reduce((s, i) => s + i.total, 0);
    expect(feb).toBe(FEB_EXPENSE);
  });
});

// ─── Data isolation ───────────────────────────────────────────────────────────

describe("Data isolation — cross-user", () => {
  let otherToken;

  beforeAll(async () => {
    const other = await User.create({
      name: "Other",
      email: "other@analytics.test",
      password: "OtherPass1!",
    });
    otherToken = generateAccessToken(other._id);
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
    });
  });

  it("first user's overview is unaffected by other user's data", async () => {
    const res = await get("/api/analytics/overview");
    expect(res.body.totalExpense).toBe(TOTAL_EXPENSE);
    expect(res.body.totalIncome).toBe(TOTAL_INCOME);
    expect(res.body.transactionsCount).toBe(TOTAL_TX_COUNT);
  });

  it("second user sees only their own data", async () => {
    const res = await request(app)
      .get("/api/analytics/overview")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.body.totalExpense).toBe(999_999);
    expect(res.body.transactionsCount).toBe(1);
  });
});
