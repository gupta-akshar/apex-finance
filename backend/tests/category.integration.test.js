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
import RecurringTransaction from "../src/models/RecurringTransaction.js";
import { generateAccessToken } from "../src/utils/generateToken.js";

// ═══════════════════════════════════════════════════════════════════════════
// Shared fixture state
// ═══════════════════════════════════════════════════════════════════════════

let mongoServer;
let tokenA, tokenB;
let userAId, userBId;

// ─── Time helpers ─────────────────────────────────────────────────────────────

const CURRENT_MONTH = new Date().getUTCMonth() + 1;
const CURRENT_YEAR = new Date().getUTCFullYear();

// ─── Request helpers ──────────────────────────────────────────────────────────

const getCategories = (token) =>
  request(app).get("/api/categories").set("Authorization", `Bearer ${token}`);

const postCategory = (token, body) =>
  request(app)
    .post("/api/categories")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

const deleteCategory = (token, id) =>
  request(app)
    .delete(`/api/categories/${id}`)
    .set("Authorization", `Bearer ${token}`);

// ─── Database lifecycle ───────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // ── User A ─────────────────────────────────────────────────────────────────
  const userA = await User.create({
    name: "Category Tester A",
    email: "cat_a@test.example.com",
    password: "Password123!",
  });
  userAId = userA._id;
  tokenA = generateAccessToken(userA._id);

  // ── User B (for isolation tests) ───────────────────────────────────────────
  const userB = await User.create({
    name: "Category Tester B",
    email: "cat_b@test.example.com",
    password: "Password456!",
  });
  userBId = userB._id;
  tokenB = generateAccessToken(userB._id);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Wipe mutable collections between tests; users survive every afterEach.
afterEach(async () => {
  await Category.deleteMany({});
  await Budget.deleteMany({});
  await RecurringTransaction.deleteMany({});
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. GET /api/categories — list, user-scoped
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/categories — list categories", () => {
  it("returns 200 with an array", async () => {
    const res = await getCategories(tokenA);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns an empty array when the user has no categories", async () => {
    const res = await getCategories(tokenA);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns only the authenticated user's own categories", async () => {
    // Seed one category for each user
    const catA = await Category.create({
      name: "Groceries",
      type: "expense",
      user: userAId,
    });
    await Category.create({
      name: "Freelance",
      type: "income",
      user: userBId,
    });

    const res = await getCategories(tokenA);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]._id.toString()).toBe(catA._id.toString());
    expect(res.body[0].name).toBe("Groceries");
  });

  it("does not expose categories belonging to another user", async () => {
    await Category.create({
      name: "UserBOnly",
      type: "expense",
      user: userBId,
    });

    const res = await getCategories(tokenA);

    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.name)).not.toContain("UserBOnly");
  });

  it("returns both income and expense categories for the same user", async () => {
    await Category.create({ name: "Salary", type: "income", user: userAId });
    await Category.create({
      name: "Transport",
      type: "expense",
      user: userAId,
    });

    const res = await getCategories(tokenA);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const types = res.body.map((c) => c.type);
    expect(types).toContain("income");
    expect(types).toContain("expense");
  });

  it("each returned document includes _id, name, type, and user fields", async () => {
    await Category.create({ name: "Bills", type: "expense", user: userAId });

    const res = await getCategories(tokenA);

    expect(res.status).toBe(200);
    const cat = res.body[0];
    expect(cat).toHaveProperty("_id");
    expect(cat).toHaveProperty("name", "Bills");
    expect(cat).toHaveProperty("type", "expense");
    expect(cat).toHaveProperty("user");
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app)
      .get("/api/categories")
      .set("Authorization", "Bearer not.a.real.token");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. POST /api/categories — create
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/categories — create a category", () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns 201 with the created document for a valid expense category", async () => {
    const res = await postCategory(tokenA, { name: "Food", type: "expense" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Food", type: "expense" });
    expect(res.body._id).toBeDefined();
  });

  it("returns 201 with the created document for a valid income category", async () => {
    const res = await postCategory(tokenA, { name: "Salary", type: "income" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Salary", type: "income" });
  });

  it("persists the category to the database", async () => {
    const res = await postCategory(tokenA, {
      name: "Utilities",
      type: "expense",
    });

    expect(res.status).toBe(201);
    const stored = await Category.findById(res.body._id);
    expect(stored).not.toBeNull();
    expect(stored.name).toBe("Utilities");
    expect(stored.type).toBe("expense");
  });

  it("scopes the new category to the authenticated user, not any body field", async () => {
    const res = await postCategory(tokenA, { name: "Rent", type: "expense" });

    expect(res.status).toBe(201);
    const stored = await Category.findById(res.body._id);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("trims leading and trailing whitespace from the name before persisting", async () => {
    const res = await postCategory(tokenA, {
      name: "  Health  ",
      type: "expense",
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Health");

    const stored = await Category.findById(res.body._id);
    expect(stored.name).toBe("Health");
  });

  it("two different users may have categories with the same name without conflict", async () => {
    const resA = await postCategory(tokenA, {
      name: "Travel",
      type: "expense",
    });
    const resB = await postCategory(tokenB, {
      name: "Travel",
      type: "expense",
    });

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
  });

  // ── Whitespace-only name ───────────────────────────────────────────────────

  it("returns 400 when name is a single space", async () => {
    const res = await postCategory(tokenA, { name: " ", type: "expense" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is only whitespace characters", async () => {
    const res = await postCategory(tokenA, { name: "   ", type: "expense" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when name trims to a single character (below min length of 2)", async () => {
    const res = await postCategory(tokenA, { name: " A ", type: "expense" });
    expect(res.status).toBe(400);
  });

  // ── Duplicate category ─────────────────────────────────────────────────────

  it("returns 409 when creating a category with the same name and type for the same user", async () => {
    await postCategory(tokenA, { name: "Shopping", type: "expense" });
    const res = await postCategory(tokenA, {
      name: "Shopping",
      type: "expense",
    });

    expect(res.status).toBe(409);
  });

  it("does not create a second document when the duplicate is rejected", async () => {
    await postCategory(tokenA, { name: "Shopping", type: "expense" });
    await postCategory(tokenA, { name: "Shopping", type: "expense" });

    const count = await Category.countDocuments({
      user: userAId,
      name: "Shopping",
      type: "expense",
    });
    expect(count).toBe(1);
  });

  it("allows the same name with a different type (income vs expense)", async () => {
    const resExp = await postCategory(tokenA, {
      name: "Bonus",
      type: "expense",
    });
    const resInc = await postCategory(tokenA, {
      name: "Bonus",
      type: "income",
    });

    expect(resExp.status).toBe(201);
    expect(resInc.status).toBe(201);
  });

  // ── Validation — missing / invalid fields ──────────────────────────────────

  it("returns 400 when name is missing from the request body", async () => {
    const res = await postCategory(tokenA, { type: "expense" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is missing from the request body", async () => {
    const res = await postCategory(tokenA, { name: "Entertainment" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is an invalid enum value", async () => {
    const res = await postCategory(tokenA, {
      name: "Misc",
      type: "transfer",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is an empty string", async () => {
    const res = await postCategory(tokenA, { name: "", type: "expense" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is shorter than 2 characters after trimming", async () => {
    const res = await postCategory(tokenA, { name: "X", type: "expense" });
    expect(res.status).toBe(400);
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Health", type: "expense" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", "Bearer garbage.token.here")
      .send({ name: "Health", type: "expense" });
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. DELETE /api/categories/:id — delete + cascade
// ═══════════════════════════════════════════════════════════════════════════

describe("DELETE /api/categories/:id — delete a category", () => {
  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns 200 with a deletion message when the owner deletes their category", async () => {
    const cat = await Category.create({
      name: "Dining",
      type: "expense",
      user: userAId,
    });

    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("removes the category document from the database", async () => {
    const cat = await Category.create({
      name: "Subscriptions",
      type: "expense",
      user: userAId,
    });

    await deleteCategory(tokenA, cat._id.toString());

    expect(await Category.findById(cat._id)).toBeNull();
  });

  it("returns 404 when the same category is deleted a second time", async () => {
    const cat = await Category.create({
      name: "Fuel",
      type: "expense",
      user: userAId,
    });

    await deleteCategory(tokenA, cat._id.toString());
    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(404);
  });

  it("returns 404 for a well-formed ObjectId that does not correspond to any category", async () => {
    const ghostId = new mongoose.Types.ObjectId().toString();
    const res = await deleteCategory(tokenA, ghostId);

    expect(res.status).toBe(404);
  });

  // ── Cascade: budget deletion ───────────────────────────────────────────────

  it("deletes all budgets associated with the deleted category", async () => {
    const cat = await Category.create({
      name: "Groceries",
      type: "expense",
      user: userAId,
    });

    // Seed two budgets for the same category in different months
    await Budget.create({
      user: userAId,
      category: cat._id,
      limit: 5000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    await Budget.create({
      user: userAId,
      category: cat._id,
      limit: 4500,
      month: CURRENT_MONTH === 1 ? 2 : 1,
      year: CURRENT_YEAR,
    });

    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.cascade.budgetsDeleted).toBe(2);

    const remainingBudgets = await Budget.countDocuments({
      category: cat._id,
    });
    expect(remainingBudgets).toBe(0);
  });

  it("reports zero budgetsDeleted in the cascade summary when the category has no budgets", async () => {
    const cat = await Category.create({
      name: "Gifts",
      type: "expense",
      user: userAId,
    });

    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.cascade.budgetsDeleted).toBe(0);
  });

  it("does not delete budgets belonging to other categories of the same user", async () => {
    const catToDelete = await Category.create({
      name: "Electronics",
      type: "expense",
      user: userAId,
    });
    const catToKeep = await Category.create({
      name: "Clothing",
      type: "expense",
      user: userAId,
    });

    await Budget.create({
      user: userAId,
      category: catToDelete._id,
      limit: 3000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });
    await Budget.create({
      user: userAId,
      category: catToKeep._id,
      limit: 2000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    await deleteCategory(tokenA, catToDelete._id.toString());

    const survivingBudget = await Budget.findOne({ category: catToKeep._id });
    expect(survivingBudget).not.toBeNull();
  });

  // ── Cascade: recurring transaction deactivation ────────────────────────────

  it("deactivates all active recurring transactions referencing the deleted category", async () => {
    const cat = await Category.create({
      name: "Internet",
      type: "expense",
      user: userAId,
    });

    // Seed two active recurring transactions for this category
    await RecurringTransaction.insertMany([
      {
        user: userAId,
        title: "ISP Bill",
        type: "expense",
        amount: 999,
        category: cat._id,
        frequency: "monthly",
        startDate: new Date(),
        isActive: true,
      },
      {
        user: userAId,
        title: "Cloud Storage",
        type: "expense",
        amount: 199,
        category: cat._id,
        frequency: "monthly",
        startDate: new Date(),
        isActive: true,
      },
    ]);

    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.cascade.recurringDeactivated).toBe(2);

    const stillActive = await RecurringTransaction.countDocuments({
      category: cat._id,
      isActive: true,
    });
    expect(stillActive).toBe(0);
  });

  it("does not modify already-paused recurring transactions (counts only active deactivations)", async () => {
    const cat = await Category.create({
      name: "Gym",
      type: "expense",
      user: userAId,
    });

    await RecurringTransaction.insertMany([
      {
        user: userAId,
        title: "Active membership",
        type: "expense",
        amount: 1500,
        category: cat._id,
        frequency: "monthly",
        startDate: new Date(),
        isActive: true,
      },
      {
        user: userAId,
        title: "Paused membership",
        type: "expense",
        amount: 800,
        category: cat._id,
        frequency: "monthly",
        startDate: new Date(),
        isActive: false, // already paused
      },
    ]);

    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(200);
    // Only the one active rule is counted as deactivated
    expect(res.body.cascade.recurringDeactivated).toBe(1);
  });

  it("reports zero recurringDeactivated when the category has no recurring transactions", async () => {
    const cat = await Category.create({
      name: "Hobbies",
      type: "expense",
      user: userAId,
    });

    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.cascade.recurringDeactivated).toBe(0);
  });

  it("does not deactivate recurring transactions that belong to other categories", async () => {
    const catToDelete = await Category.create({
      name: "Streaming",
      type: "expense",
      user: userAId,
    });
    const catToKeep = await Category.create({
      name: "Phone",
      type: "expense",
      user: userAId,
    });

    const unrelatedRecurring = await RecurringTransaction.create({
      user: userAId,
      title: "Phone Bill",
      type: "expense",
      amount: 599,
      category: catToKeep._id,
      frequency: "monthly",
      startDate: new Date(),
      isActive: true,
    });

    await deleteCategory(tokenA, catToDelete._id.toString());

    const reloaded = await RecurringTransaction.findById(
      unrelatedRecurring._id,
    );
    expect(reloaded.isActive).toBe(true);
  });

  it("cascade response includes both budgetsDeleted and recurringDeactivated keys", async () => {
    const cat = await Category.create({
      name: "Childcare",
      type: "expense",
      user: userAId,
    });

    await Budget.create({
      user: userAId,
      category: cat._id,
      limit: 10000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    await RecurringTransaction.create({
      user: userAId,
      title: "Daycare fee",
      type: "expense",
      amount: 8000,
      category: cat._id,
      frequency: "monthly",
      startDate: new Date(),
      isActive: true,
    });

    const res = await deleteCategory(tokenA, cat._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.cascade).toMatchObject({
      budgetsDeleted: 1,
      recurringDeactivated: 1,
    });
  });

  // ── Cross-user protection ──────────────────────────────────────────────────

  it("returns 404 when user B tries to delete user A's category", async () => {
    const cat = await Category.create({
      name: "UserAPrivate",
      type: "expense",
      user: userAId,
    });

    const res = await deleteCategory(tokenB, cat._id.toString());

    expect(res.status).toBe(404);
  });

  it("does not delete user A's category when user B's attempt is rejected", async () => {
    const cat = await Category.create({
      name: "UserAProtected",
      type: "income",
      user: userAId,
    });

    await deleteCategory(tokenB, cat._id.toString());

    const stillExists = await Category.findById(cat._id);
    expect(stillExists).not.toBeNull();
  });

  it("does not cascade-delete user A's budgets when user B is rejected", async () => {
    const cat = await Category.create({
      name: "UserABudgetSafe",
      type: "expense",
      user: userAId,
    });

    await Budget.create({
      user: userAId,
      category: cat._id,
      limit: 2000,
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
    });

    await deleteCategory(tokenB, cat._id.toString()); // rejected

    const budget = await Budget.findOne({ category: cat._id });
    expect(budget).not.toBeNull();
  });

  it("does not deactivate user A's recurring transactions when user B is rejected", async () => {
    const cat = await Category.create({
      name: "UserARecurringSafe",
      type: "expense",
      user: userAId,
    });

    const rec = await RecurringTransaction.create({
      user: userAId,
      title: "Protected recurring",
      type: "expense",
      amount: 500,
      category: cat._id,
      frequency: "monthly",
      startDate: new Date(),
      isActive: true,
    });

    await deleteCategory(tokenB, cat._id.toString()); // rejected

    const reloaded = await RecurringTransaction.findById(rec._id);
    expect(reloaded.isActive).toBe(true);
  });

  it("user A can still delete their own unrelated categories after a cross-user rejection", async () => {
    const targetCat = await Category.create({
      name: "UserATarget",
      type: "expense",
      user: userAId,
    });
    const otherCat = await Category.create({
      name: "UserAOther",
      type: "income",
      user: userAId,
    });

    // User B fails to delete targetCat
    await deleteCategory(tokenB, targetCat._id.toString());

    // User A successfully deletes otherCat
    const res = await deleteCategory(tokenA, otherCat._id.toString());
    expect(res.status).toBe(200);

    // targetCat is still intact
    expect(await Category.findById(targetCat._id)).not.toBeNull();
    // otherCat is gone
    expect(await Category.findById(otherCat._id)).toBeNull();
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const cat = await Category.create({
      name: "AuthTest",
      type: "expense",
      user: userAId,
    });

    const res = await request(app).delete(
      `/api/categories/${cat._id.toString()}`,
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const cat = await Category.create({
      name: "AuthTestMalformed",
      type: "expense",
      user: userAId,
    });

    const res = await request(app)
      .delete(`/api/categories/${cat._id.toString()}`)
      .set("Authorization", "Bearer garbage.token.here");
    expect(res.status).toBe(401);
  });
});
