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
import Budget from "../src/models/Budget.js";
import Transaction from "../src/models/Transaction.js";
import { generateAccessToken } from "../src/utils/generateToken.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let mongoServer;
let tokenA, tokenB;
let userAId, userBId;
let expenseCatId, incomeCatId, userBExpCatId;

const CURRENT_MONTH = new Date().getUTCMonth() + 1;
const CURRENT_YEAR = new Date().getUTCFullYear();

let _dateSeq = 0;
const uniquePastDate = () => {
  const d = new Date(Date.now() - ++_dateSeq * 60_000);
  return d.toISOString();
};

// ─── Request helpers ──────────────────────────────────────────────────────────

const setBudget = (token, body) =>
  request(app)
    .post("/api/budgets")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
const getBudgetStatus = (token, query = {}) =>
  request(app)
    .get("/api/budgets/status")
    .set("Authorization", `Bearer ${token}`)
    .query(query);
const getBudgets = (token, query = {}) =>
  request(app)
    .get("/api/budgets")
    .set("Authorization", `Bearer ${token}`)
    .query(query);
const deleteBudget = (token, id) =>
  request(app)
    .delete(`/api/budgets/${id}`)
    .set("Authorization", `Bearer ${token}`);
const createTx = (token, body) =>
  request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

const validBudgetBody = (overrides = {}) => ({
  category: expenseCatId.toString(),
  limit: 5000,
  month: CURRENT_MONTH,
  year: CURRENT_YEAR,
  ...overrides,
});

// ─── DB lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const userA = await User.create({
    name: "Budget Tester A",
    email: "budget_a@test.example.com",
    password: "Password123!",
  });
  userAId = userA._id;
  tokenA = generateAccessToken(userA._id);

  const userB = await User.create({
    name: "Budget Tester B",
    email: "budget_b@test.example.com",
    password: "Password456!",
  });
  userBId = userB._id;
  tokenB = generateAccessToken(userB._id);

  const expenseCat = await Category.create({
    name: "Food",
    type: "expense",
    user: userAId,
  });
  expenseCatId = expenseCat._id;

  const incomeCat = await Category.create({
    name: "Salary",
    type: "income",
    user: userAId,
  });
  incomeCatId = incomeCat._id;

  const userBExpCat = await Category.create({
    name: "Transport",
    type: "expense",
    user: userBId,
  });
  userBExpCatId = userBExpCat._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Budget.deleteMany({});
  await Transaction.deleteMany({});
  await Category.deleteMany({
    _id: { $nin: [expenseCatId, incomeCatId, userBExpCatId] },
  });
});

// ─── POST /api/budgets ────────────────────────────────────────────────────────

describe("POST /api/budgets — create or upsert", () => {
  it("returns 200 with populated budget for a valid expense category", async () => {
    const res = await setBudget(tokenA, validBudgetBody());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      limit: 5000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.body.category).toMatchObject({ name: "Food", type: "expense" });
  });

  it("upserts and returns new limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 2000 }));
    const res = await setBudget(tokenA, validBudgetBody({ limit: 9000 }));
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(9000);
  });

  it("never creates duplicate documents on upsert", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1000 }));
    await setBudget(tokenA, validBudgetBody({ limit: 2000 }));
    expect(await Budget.countDocuments({ user: userAId })).toBe(1);
  });

  it("persists to database", async () => {
    const res = await setBudget(tokenA, validBudgetBody());
    const stored = await Budget.findById(res.body._id);
    expect(stored).not.toBeNull();
    expect(stored.limit).toBe(5000);
  });

  it("returns 400 for negative limit", async () => {
    expect(
      (await setBudget(tokenA, validBudgetBody({ limit: -1 }))).status,
    ).toBe(400);
  });
  it("returns 400 for zero limit", async () => {
    expect(
      (await setBudget(tokenA, validBudgetBody({ limit: 0 }))).status,
    ).toBe(400);
  });
  it("returns 400 for missing limit", async () => {
    const { limit: _, ...body } = validBudgetBody();
    expect((await setBudget(tokenA, body)).status).toBe(400);
  });
  it("returns 400 for month=0", async () => {
    expect(
      (await setBudget(tokenA, validBudgetBody({ month: 0 }))).status,
    ).toBe(400);
  });
  it("returns 400 for month=13", async () => {
    expect(
      (await setBudget(tokenA, validBudgetBody({ month: 13 }))).status,
    ).toBe(400);
  });
  it("returns 400 for missing month", async () => {
    const { month: _, ...body } = validBudgetBody();
    expect((await setBudget(tokenA, body)).status).toBe(400);
  });
  it("returns 400 for invalid category ObjectId", async () => {
    expect(
      (await setBudget(tokenA, validBudgetBody({ category: "not-an-id" })))
        .status,
    ).toBe(400);
  });
  it("returns 400 for missing category", async () => {
    const { category: _, ...body } = validBudgetBody();
    expect((await setBudget(tokenA, body)).status).toBe(400);
  });
  it("returns 404 for non-existent category", async () => {
    expect(
      (
        await setBudget(
          tokenA,
          validBudgetBody({
            category: new mongoose.Types.ObjectId().toString(),
          }),
        )
      ).status,
    ).toBe(404);
  });
  it("returns 404 when category belongs to another user", async () => {
    expect(
      (
        await setBudget(
          tokenA,
          validBudgetBody({ category: userBExpCatId.toString() }),
        )
      ).status,
    ).toBe(404);
  });
  it("returns 400 for income category", async () => {
    expect(
      (
        await setBudget(
          tokenA,
          validBudgetBody({ category: incomeCatId.toString() }),
        )
      ).status,
    ).toBe(400);
  });
  it("returns 401 without token", async () => {
    expect(
      (await request(app).post("/api/budgets").send(validBudgetBody())).status,
    ).toBe(401);
  });
});

// ─── GET /api/budgets/status ──────────────────────────────────────────────────

describe("GET /api/budgets/status — budget progress", () => {
  describe("happy path — partially spent budget", () => {
    beforeEach(async () => {
      await setBudget(tokenA, validBudgetBody({ limit: 5000 }));
      await createTx(tokenA, {
        type: "expense",
        amount: 2000,
        category: expenseCatId.toString(),
        date: uniquePastDate(),
      });
    });

    it("returns HTTP 200 with an array", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("returns exactly one entry", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body).toHaveLength(1);
    });

    it("reports correct limit, spent, remaining, percentage", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      const e = res.body[0];
      expect(e.limit).toBe(5000);
      expect(e.spent).toBe(2000);
      expect(e.remaining).toBe(3000);
      expect(e.percentage).toBeCloseTo(40, 1);
    });

    it("warning=false when spending < 80%", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].warning).toBe(false);
    });

    it("exceeded=false when under limit", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].exceeded).toBe(false);
    });

    it("populates categoryName", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].categoryName).toBe("Food");
    });

    it("exposes category ObjectId", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].category.toString()).toBe(expenseCatId.toString());
    });
  });

  it("warning=true at exactly 80% of limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1000 }));
    await createTx(tokenA, {
      type: "expense",
      amount: 800,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.body[0].warning).toBe(true);
  });

  it("exceeded=true when over limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 500 }));
    await createTx(tokenA, {
      type: "expense",
      amount: 750,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.body[0].exceeded).toBe(true);
    expect(res.body[0].remaining).toBe(-250);
  });

  it("spent=0 when budget exists but no transactions", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));
    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.body[0].spent).toBe(0);
    expect(res.body[0].remaining).toBe(3000);
    expect(res.body[0].percentage).toBe(0);
  });

  it("returns empty array with no budgets", async () => {
    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.body).toEqual([]);
  });

  it("silently skips orphaned budgets (deleted category)", async () => {
    const tempCat = await Category.create({
      name: "Ephemeral",
      type: "expense",
      user: userAId,
    });
    await Budget.create({
      user: userAId,
      category: tempCat._id,
      limit: 2000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    await Category.findByIdAndDelete(tempCat._id);

    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns only non-orphaned entries when mixed", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));
    const tempCat = await Category.create({
      name: "TempOrphan",
      type: "expense",
      user: userAId,
    });
    await Budget.create({
      user: userAId,
      category: tempCat._id,
      limit: 999,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    await Category.findByIdAndDelete(tempCat._id);

    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].categoryName).toBe("Food");
  });

  it("returns 400 when month is missing", async () => {
    expect((await getBudgetStatus(tokenA, { year: CURRENT_YEAR })).status).toBe(
      400,
    );
  });
  it("returns 400 when year is missing", async () => {
    expect(
      (await getBudgetStatus(tokenA, { month: CURRENT_MONTH })).status,
    ).toBe(400);
  });
  it("returns 401 without token", async () => {
    expect(
      (
        await request(app)
          .get("/api/budgets/status")
          .query({ month: CURRENT_MONTH, year: CURRENT_YEAR })
      ).status,
    ).toBe(401);
  });

  it("does not expose User B's budgets to User A", async () => {
    await setBudget(tokenB, {
      category: userBExpCatId.toString(),
      limit: 99999,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/budgets ─────────────────────────────────────────────────────────

describe("GET /api/budgets — list", () => {
  it("returns user's budgets as array", async () => {
    await setBudget(tokenA, validBudgetBody());
    const res = await getBudgets(tokenA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it("returns empty array with no budgets", async () => {
    expect((await getBudgets(tokenA)).body).toEqual([]);
  });

  it("filters by month and year", async () => {
    await setBudget(tokenA, validBudgetBody({ month: 1, year: CURRENT_YEAR }));
    await setBudget(tokenA, validBudgetBody({ month: 2, year: CURRENT_YEAR }));
    const res = await getBudgets(tokenA, { month: 1, year: CURRENT_YEAR });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].month).toBe(1);
  });

  it("does not return other users' budgets", async () => {
    await setBudget(tokenB, {
      category: userBExpCatId.toString(),
      limit: 1000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    expect((await getBudgets(tokenA)).body).toEqual([]);
  });

  it("returns 401 without token", async () => {
    expect((await request(app).get("/api/budgets")).status).toBe(401);
  });
});

// ─── DELETE /api/budgets/:id ──────────────────────────────────────────────────

describe("DELETE /api/budgets/:id", () => {
  let budgetId;
  beforeEach(async () => {
    const res = await setBudget(tokenA, validBudgetBody());
    budgetId = res.body._id;
  });

  it("returns 200 with deletion message", async () => {
    const res = await deleteBudget(tokenA, budgetId);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("removes document from database", async () => {
    await deleteBudget(tokenA, budgetId);
    expect(await Budget.findById(budgetId)).toBeNull();
  });

  it("second delete returns 404", async () => {
    await deleteBudget(tokenA, budgetId);
    expect((await deleteBudget(tokenA, budgetId)).status).toBe(404);
  });

  it("returns 404 for non-existent id", async () => {
    expect(
      (await deleteBudget(tokenA, new mongoose.Types.ObjectId().toString()))
        .status,
    ).toBe(404);
  });

  it("returns 404 when User B tries to delete User A's budget", async () => {
    expect((await deleteBudget(tokenB, budgetId)).status).toBe(404);
  });

  it("leaves budget intact after unauthorized attempt", async () => {
    await deleteBudget(tokenB, budgetId);
    expect(await Budget.findById(budgetId)).not.toBeNull();
  });

  it("returns 401 without token", async () => {
    expect((await request(app).delete(`/api/budgets/${budgetId}`)).status).toBe(
      401,
    );
  });
});

// ─── Budget warning on POST /api/transactions ─────────────────────────────────

describe("Budget warning behavior during POST /api/transactions", () => {
  it("budgetWarning=false with no budget", async () => {
    const res = await createTx(tokenA, {
      type: "expense",
      amount: 1000,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
    expect(res.body.warningMessage).toBe("");
  });

  it("budgetWarning=false when under limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 5000 }));
    const res = await createTx(tokenA, {
      type: "expense",
      amount: 4999,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(res.body.budgetWarning).toBe(false);
  });

  it("budgetWarning=false when exactly at limit (uses > not >=)", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));
    const res = await createTx(tokenA, {
      type: "expense",
      amount: 3000,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(res.body.budgetWarning).toBe(false);
  });

  it("budgetWarning=true when over limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1000 }));
    const res = await createTx(tokenA, {
      type: "expense",
      amount: 1500,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(res.body.budgetWarning).toBe(true);
    expect(res.body.warningMessage).toMatch(/500/);
    expect(res.body.warningMessage).toMatch(/exceeded/i);
  });

  it("accumulates prior spending in warning calculation", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));
    const first = await createTx(tokenA, {
      type: "expense",
      amount: 2500,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(first.body.budgetWarning).toBe(false);

    const second = await createTx(tokenA, {
      type: "expense",
      amount: 600,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(second.body.budgetWarning).toBe(true);
    expect(second.body.warningMessage).toMatch(/100/);
  });

  it("never triggers warning for income transactions", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1 }));
    const res = await createTx(tokenA, {
      type: "income",
      amount: 999999,
      category: incomeCatId.toString(),
      date: uniquePastDate(),
    });
    expect(res.body.budgetWarning).toBe(false);
  });

  it("persists transaction even when budgetWarning is true", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 100 }));
    const res = await createTx(tokenA, {
      type: "expense",
      amount: 500,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(201);
    expect(await Transaction.findById(res.body.transaction._id)).not.toBeNull();
  });

  it("does not trigger warning from another user's budget", async () => {
    await setBudget(tokenB, {
      category: userBExpCatId.toString(),
      limit: 1,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    const res = await createTx(tokenA, {
      type: "expense",
      amount: 999,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(res.body.budgetWarning).toBe(false);
  });
});
