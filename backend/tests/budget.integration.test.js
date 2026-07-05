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
import Budget from "../src/models/Budget.js";
import Transaction from "../src/models/Transaction.js";
import { generateAccessToken } from "../src/utils/generateToken.js";

// ─── Shared fixture state ─────────────────────────────────────────────────────
let mongoServer;
let tokenA, tokenB;
let userAId, userBId;
let expenseCatId; // expense category owned by user A
let incomeCatId; // income  category owned by user A
let userBExpCatId; // expense category owned by user B

// ─── Time helpers ─────────────────────────────────────────────────────────────
// Computed once so every test in the suite targets the same calendar period.
const CURRENT_MONTH = new Date().getUTCMonth() + 1; // 1-based
const CURRENT_YEAR = new Date().getUTCFullYear();

// Each call produces a unique UTC timestamp in the recent past so the
// Transaction sparse-unique index ( sourceRecurringId + date ) is never hit.
let _dateSeq = 0;
const uniquePastDate = () => {
  const d = new Date(Date.now() - ++_dateSeq * 60_000);
  return d.toISOString();
};

// ─── Request helpers ──────────────────────────────────────────────────────────

/** POST /api/budgets */
const setBudget = (token, body) =>
  request(app)
    .post("/api/budgets")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

/** GET /api/budgets/status */
const getBudgetStatus = (token, query = {}) =>
  request(app)
    .get("/api/budgets/status")
    .set("Authorization", `Bearer ${token}`)
    .query(query);

/** GET /api/budgets */
const getBudgets = (token, query = {}) =>
  request(app)
    .get("/api/budgets")
    .set("Authorization", `Bearer ${token}`)
    .query(query);

/** DELETE /api/budgets/:id */
const deleteBudget = (token, id) =>
  request(app)
    .delete(`/api/budgets/${id}`)
    .set("Authorization", `Bearer ${token}`);

/** POST /api/transactions */
const createTransaction = (token, body) =>
  request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

// ─── Fixture factory ──────────────────────────────────────────────────────────

/** Returns a valid POST /api/budgets body for user A's expense category. */
const validBudgetBody = (overrides = {}) => ({
  category: expenseCatId.toString(),
  limit: 5000,
  month: CURRENT_MONTH,
  year: CURRENT_YEAR,
  ...overrides,
});

// ─── Database lifecycle ───────────────────────────────────────────────────────

let mongoServer_instance;

beforeAll(async () => {
  mongoServer_instance = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer_instance.getUri());

  // ── User A ─────────────────────────────────────────────────────────────────
  const userA = await User.create({
    name: "Budget Tester A",
    email: "budget_a@test.example.com",
    password: "Password123!",
  });
  userAId = userA._id;
  tokenA = generateAccessToken(userA._id);

  // ── User B (for data-isolation tests) ─────────────────────────────────────
  const userB = await User.create({
    name: "Budget Tester B",
    email: "budget_b@test.example.com",
    password: "Password456!",
  });
  userBId = userB._id;
  tokenB = generateAccessToken(userB._id);

  // ── Categories ─────────────────────────────────────────────────────────────
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
  await mongoServer_instance.stop();
});

// Wipe only the mutable collections between tests.
// Permanent users and their three seed categories survive every afterEach.
afterEach(async () => {
  await Budget.deleteMany({});
  await Transaction.deleteMany({});
  // Remove any ephemeral categories created inside individual tests.
  await Category.deleteMany({
    _id: { $nin: [expenseCatId, incomeCatId, userBExpCatId] },
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/budgets — create or upsert a budget
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/budgets — create or upsert a budget", () => {
  // ── Valid request ─────────────────────────────────────────────────────────

  it("returns 200 with a populated budget document for a valid expense category", async () => {
    const res = await setBudget(tokenA, validBudgetBody());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      limit: 5000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    // Category must be populated (name + type), not a raw ObjectId string
    expect(res.body.category).toMatchObject({ name: "Food", type: "expense" });
  });

  it("upserts an existing budget and returns the new limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 2000 }));
    const res = await setBudget(tokenA, validBudgetBody({ limit: 9000 }));

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(9000);
  });

  it("never creates duplicate documents when upserting for the same user/category/month/year", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1000 }));
    await setBudget(tokenA, validBudgetBody({ limit: 2000 }));

    const count = await Budget.countDocuments({ user: userAId });
    expect(count).toBe(1);
  });

  it("persists the budget to the database", async () => {
    const res = await setBudget(tokenA, validBudgetBody());

    const stored = await Budget.findById(res.body._id);
    expect(stored).not.toBeNull();
    expect(stored.limit).toBe(5000);
  });

  // ── Negative / zero / missing limit ──────────────────────────────────────

  it("returns 400 when limit is negative", async () => {
    const res = await setBudget(tokenA, validBudgetBody({ limit: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when limit is zero", async () => {
    const res = await setBudget(tokenA, validBudgetBody({ limit: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when limit is missing from the request body", async () => {
    const { limit: _omit, ...body } = validBudgetBody();
    expect((await setBudget(tokenA, body)).status).toBe(400);
  });

  // ── Invalid month ─────────────────────────────────────────────────────────

  it("returns 400 when month is 0 (below valid range)", async () => {
    const res = await setBudget(tokenA, validBudgetBody({ month: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when month is 13 (above valid range)", async () => {
    const res = await setBudget(tokenA, validBudgetBody({ month: 13 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when month is absent from the request body", async () => {
    const { month: _omit, ...body } = validBudgetBody();
    expect((await setBudget(tokenA, body)).status).toBe(400);
  });

  // ── Invalid category ──────────────────────────────────────────────────────

  it("returns 400 when category is not a valid ObjectId string", async () => {
    const res = await setBudget(
      tokenA,
      validBudgetBody({ category: "not-an-objectid" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when category is absent from the request body", async () => {
    const { category: _omit, ...body } = validBudgetBody();
    expect((await setBudget(tokenA, body)).status).toBe(400);
  });

  it("returns 404 when the category ObjectId does not exist in the database", async () => {
    const ghostId = new mongoose.Types.ObjectId().toString();
    const res = await setBudget(tokenA, validBudgetBody({ category: ghostId }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when the category belongs to a different user", async () => {
    // userBExpCatId is owned by userB — userA may not budget against it
    const res = await setBudget(
      tokenA,
      validBudgetBody({ category: userBExpCatId.toString() }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when the category is of type 'income'", async () => {
    // Budgets are only meaningful for expense categories
    const res = await setBudget(
      tokenA,
      validBudgetBody({ category: incomeCatId.toString() }),
    );
    expect(res.status).toBe(400);
  });

  // ── Authentication ────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app).post("/api/budgets").send(validBudgetBody());
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/budgets/status — budget progress for a given month/year
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/budgets/status — budget progress", () => {
  // ── Happy path ────────────────────────────────────────────────────────────

  describe("happy path — budget created and partially spent", () => {
    beforeEach(async () => {
      // ₹5,000 budget for the current month
      await setBudget(tokenA, validBudgetBody({ limit: 5000 }));

      // ₹2,000 expense in the same month
      await createTransaction(tokenA, {
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

    it("returns exactly one entry matching the seeded budget", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body).toHaveLength(1);
    });

    it("reports correct limit, spent, remaining, and percentage values", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      const entry = res.body[0];

      expect(entry.limit).toBe(5000);
      expect(entry.spent).toBe(2000);
      expect(entry.remaining).toBe(3000);
      expect(entry.percentage).toBeCloseTo(40, 1); // (2000/5000)*100 = 40%
    });

    it("sets warning=false when spending is below 80% of the limit", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].warning).toBe(false);
    });

    it("sets exceeded=false when spending is under the limit", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].exceeded).toBe(false);
    });

    it("populates categoryName from the referenced Category document", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].categoryName).toBe("Food");
    });

    it("exposes the Category ObjectId as the 'category' field", async () => {
      const res = await getBudgetStatus(tokenA, {
        month: CURRENT_MONTH,
        year: CURRENT_YEAR,
      });
      expect(res.body[0].category.toString()).toBe(expenseCatId.toString());
    });
  });

  it("sets warning=true when spending reaches exactly 80% of the limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1000 }));
    await createTransaction(tokenA, {
      type: "expense",
      amount: 800, // 800/1000 = 80%
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    expect(res.status).toBe(200);
    expect(res.body[0].warning).toBe(true);
  });

  it("sets exceeded=true when total spending surpasses the limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 500 }));
    await createTransaction(tokenA, {
      type: "expense",
      amount: 750,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    expect(res.status).toBe(200);
    expect(res.body[0].exceeded).toBe(true);
    expect(res.body[0].remaining).toBe(-250);
  });

  it("reports zero spending when the budget exists but no transactions do", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));

    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    expect(res.status).toBe(200);
    expect(res.body[0].spent).toBe(0);
    expect(res.body[0].remaining).toBe(3000);
    expect(res.body[0].percentage).toBe(0);
    expect(res.body[0].warning).toBe(false);
    expect(res.body[0].exceeded).toBe(false);
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it("returns an empty array when the user has no budgets for the queried period", async () => {
    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns an empty array for a month that has no budgets even when other months do", async () => {
    // Budget in month 1 only
    await setBudget(tokenA, validBudgetBody({ month: 1, year: CURRENT_YEAR }));

    // Query month 2 — should be empty
    const res = await getBudgetStatus(tokenA, { month: 2, year: CURRENT_YEAR });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // ── Orphaned category guard ───────────────────────────────────────────────

  it("returns an empty array and does not throw when the budget's category has been deleted", async () => {
    // Create a temporary category and reference it from a budget
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

    // Simulate orphan: delete the category but leave the budget document intact
    await Category.findByIdAndDelete(tempCat._id);

    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    expect(res.status).toBe(200);
    // The orphaned entry is silently skipped — no crash, no stale row
    expect(res.body).toEqual([]);
  });

  it("returns only non-orphaned entries when valid and orphaned budgets coexist", async () => {
    // Valid budget (permanent expense category)
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));

    // Orphaned budget
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

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].categoryName).toBe("Food");
    expect(res.body[0].limit).toBe(3000);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when month param is missing", async () => {
    const res = await getBudgetStatus(tokenA, { year: CURRENT_YEAR });
    expect(res.status).toBe(400);
  });

  it("returns 400 when year param is missing", async () => {
    const res = await getBudgetStatus(tokenA, { month: CURRENT_MONTH });
    expect(res.status).toBe(400);
  });

  // ── Authentication ────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app)
      .get("/api/budgets/status")
      .query({ month: CURRENT_MONTH, year: CURRENT_YEAR });
    expect(res.status).toBe(401);
  });

  // ── Data isolation ────────────────────────────────────────────────────────

  it("does not expose user B's budgets in user A's status response", async () => {
    // User B creates a budget
    await setBudget(tokenB, {
      category: userBExpCatId.toString(),
      limit: 99999,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    // User A has no budgets — response must remain empty
    const res = await getBudgetStatus(tokenA, {
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/budgets — list budgets with optional filters
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/budgets — list budgets", () => {
  it("returns 200 with an array of the authenticated user's budgets", async () => {
    await setBudget(tokenA, validBudgetBody());

    const res = await getBudgets(tokenA);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it("returns an empty array when the user has no budgets", async () => {
    const res = await getBudgets(tokenA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("filters by month and year when those params are supplied", async () => {
    // Month 1 budget
    await setBudget(tokenA, validBudgetBody({ month: 1, year: CURRENT_YEAR }));
    // Month 2 budget
    await setBudget(tokenA, validBudgetBody({ month: 2, year: CURRENT_YEAR }));

    const res = await getBudgets(tokenA, { month: 1, year: CURRENT_YEAR });

    expect(res.status).toBe(200);
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

    const res = await getBudgets(tokenA);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app).get("/api/budgets");
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/budgets/:id — remove a budget
// ═════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/budgets/:id — remove a budget", () => {
  let budgetId;

  beforeEach(async () => {
    const res = await setBudget(tokenA, validBudgetBody());
    budgetId = res.body._id;
  });

  // ── Owner deletion ────────────────────────────────────────────────────────

  it("returns 200 with a deletion-confirmation message when the owner deletes their budget", async () => {
    const res = await deleteBudget(tokenA, budgetId);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("removes the budget document from the database on successful deletion", async () => {
    await deleteBudget(tokenA, budgetId);

    const stored = await Budget.findById(budgetId);
    expect(stored).toBeNull();
  });

  it("returns 404 when the same budget is deleted a second time", async () => {
    await deleteBudget(tokenA, budgetId);
    const res = await deleteBudget(tokenA, budgetId);

    expect(res.status).toBe(404);
  });

  it("returns 404 for a well-formed ObjectId that does not correspond to any budget", async () => {
    const ghostId = new mongoose.Types.ObjectId().toString();
    const res = await deleteBudget(tokenA, ghostId);

    expect(res.status).toBe(404);
  });

  // ── Unauthorized deletion attempt ─────────────────────────────────────────

  it("returns 404 when user B attempts to delete user A's budget", async () => {
    const res = await deleteBudget(tokenB, budgetId);

    expect(res.status).toBe(404);
  });

  it("leaves the budget document intact when an unauthorized user attempts deletion", async () => {
    await deleteBudget(tokenB, budgetId);

    const stored = await Budget.findById(budgetId);
    expect(stored).not.toBeNull();
  });

  it("does not affect user A's remaining budgets when user B's deletion attempt is rejected", async () => {
    // Create a second budget for user A
    const second = await Category.create({
      name: "Entertainment",
      type: "expense",
      user: userAId,
    });
    await setBudget(tokenA, {
      category: second._id.toString(),
      limit: 1500,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    await deleteBudget(tokenB, budgetId); // rejected

    const count = await Budget.countDocuments({ user: userAId });
    expect(count).toBe(2); // both still exist
  });

  // ── Authentication ────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app).delete(`/api/budgets/${budgetId}`);
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Budget warning behavior — POST /api/transactions
// ═════════════════════════════════════════════════════════════════════════════

describe("Budget warning behavior during POST /api/transactions", () => {
  // ── No budget configured ──────────────────────────────────────────────────

  it("returns budgetWarning=false and an empty warningMessage when no budget exists for the category", async () => {
    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 1000,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
    expect(res.body.warningMessage).toBe("");
  });

  // ── Spending within limit ─────────────────────────────────────────────────

  it("returns budgetWarning=false when the new transaction keeps spending under the limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 5000 }));

    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 4999,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
  });

  it("returns budgetWarning=false when total spending equals the limit exactly", async () => {
    // The controller uses newTotal > limit, so equality is not a warning
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));

    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 3000,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
  });

  // ── Spending exceeds limit ────────────────────────────────────────────────

  it("returns budgetWarning=true when the new transaction would push spending over the limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1000 }));

    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 1500,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(true);
  });

  it("includes a warningMessage that states the overspend amount in rupees", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 1000 }));

    // Overspend: 1500 - 1000 = 500
    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 1500,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.body.warningMessage).toMatch(/500/);
    expect(res.body.warningMessage).toMatch(/exceeded/i);
  });

  it("accumulates prior spending when evaluating whether the new transaction breaches the limit", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 3000 }));

    // First transaction: ₹2,500 — still within budget
    const first = await createTransaction(tokenA, {
      type: "expense",
      amount: 2500,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(first.status).toBe(201);
    expect(first.body.budgetWarning).toBe(false);

    // Second transaction: ₹600 — cumulative total ₹3,100 > ₹3,000 limit
    // Overspend: 3100 - 3000 = 100
    const second = await createTransaction(tokenA, {
      type: "expense",
      amount: 600,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });
    expect(second.status).toBe(201);
    expect(second.body.budgetWarning).toBe(true);
    expect(second.body.warningMessage).toMatch(/100/);
  });

  // ── Income transactions are exempt ────────────────────────────────────────

  it("never triggers a budget warning for income transactions regardless of amount", async () => {
    // Set a minimal expense budget to ensure a corresponding income tx
    // would exceed it if the type check were missing
    await setBudget(tokenA, validBudgetBody({ limit: 1 }));

    const res = await createTransaction(tokenA, {
      type: "income",
      amount: 999999,
      category: incomeCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
  });

  // ── Transaction is always persisted ──────────────────────────────────────

  it("persists the transaction to the database even when budgetWarning is true", async () => {
    await setBudget(tokenA, validBudgetBody({ limit: 100 }));

    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 500,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(res.body.transaction).toBeDefined();
    expect(res.body.transaction._id).toBeTruthy();

    const stored = await Transaction.findById(res.body.transaction._id);
    expect(stored).not.toBeNull();
    expect(stored.amount).toBe(500);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("includes a budgetWarning boolean on every successful transaction response", async () => {
    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 50,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(typeof res.body.budgetWarning).toBe("boolean");
  });

  // ── Data isolation ────────────────────────────────────────────────────────

  it("does not trigger a warning for user A based on user B's budget configuration", async () => {
    // User B has a very restrictive budget on their own category
    await setBudget(tokenB, {
      category: userBExpCatId.toString(),
      limit: 1,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    // User A spends against their own category with no budget set
    const res = await createTransaction(tokenA, {
      type: "expense",
      amount: 999,
      category: expenseCatId.toString(),
      date: uniquePastDate(),
    });

    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
  });
});
