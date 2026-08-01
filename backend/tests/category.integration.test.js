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
import RecurringTransaction from "../src/models/RecurringTransaction.js";
import { generateAccessToken } from "../src/utils/generateToken.js";

let mongoServer;
let tokenA, tokenB;
let userAId, userBId;

const CURRENT_MONTH = new Date().getUTCMonth() + 1;
const CURRENT_YEAR = new Date().getUTCFullYear();

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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const userA = await User.create({
    name: "Cat Tester A",
    email: "cat_a@test.example.com",
    password: "Password123!",
  });
  userAId = userA._id;
  tokenA = generateAccessToken(userA._id);

  const userB = await User.create({
    name: "Cat Tester B",
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

afterEach(async () => {
  await Category.deleteMany({});
  await Budget.deleteMany({});
  await RecurringTransaction.deleteMany({});
});

// ─── GET /api/categories ──────────────────────────────────────────────────────

describe("GET /api/categories", () => {
  it("returns 200 with array", async () => {
    expect((await getCategories(tokenA)).status).toBe(200);
    expect(Array.isArray((await getCategories(tokenA)).body)).toBe(true);
  });

  it("returns empty array when user has no categories", async () => {
    expect((await getCategories(tokenA)).body).toEqual([]);
  });

  it("returns only authenticated user's categories", async () => {
    const catA = await Category.create({
      name: "Groceries",
      type: "expense",
      user: userAId,
    });
    await Category.create({ name: "Freelance", type: "income", user: userBId });
    const res = await getCategories(tokenA);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]._id.toString()).toBe(catA._id.toString());
  });

  it("does not expose another user's categories", async () => {
    await Category.create({
      name: "UserBOnly",
      type: "expense",
      user: userBId,
    });
    const res = await getCategories(tokenA);
    expect(res.body.map((c) => c.name)).not.toContain("UserBOnly");
  });

  it("returns 401 without token", async () => {
    expect((await request(app).get("/api/categories")).status).toBe(401);
  });
});

// ─── POST /api/categories ─────────────────────────────────────────────────────

describe("POST /api/categories — create", () => {
  it("returns 201 for valid expense category", async () => {
    const res = await postCategory(tokenA, { name: "Food", type: "expense" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Food", type: "expense" });
  });

  it("returns 201 for valid income category", async () => {
    const res = await postCategory(tokenA, { name: "Salary", type: "income" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Salary", type: "income" });
  });

  it("persists to database", async () => {
    const res = await postCategory(tokenA, {
      name: "Utilities",
      type: "expense",
    });
    const stored = await Category.findById(res.body._id);
    expect(stored.name).toBe("Utilities");
  });

  it("scopes to authenticated user", async () => {
    const res = await postCategory(tokenA, { name: "Rent", type: "expense" });
    const stored = await Category.findById(res.body._id);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("trims whitespace from name", async () => {
    const res = await postCategory(tokenA, {
      name: "  Health  ",
      type: "expense",
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Health");
  });

  it("two different users may have categories with the same name", async () => {
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

  it("returns 409 for duplicate category — no ReferenceError (scoped variable fix)", async () => {
    await postCategory(tokenA, { name: "Shopping", type: "expense" });
    const res = await postCategory(tokenA, {
      name: "Shopping",
      type: "expense",
    });
    expect(res.status).toBe(409);
    // Verify the message actually contains the category name (would fail if ReferenceError thrown)
    expect(res.body.message).toMatch(/Shopping/i);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("does not create duplicate on rejection", async () => {
    await postCategory(tokenA, { name: "Shopping", type: "expense" });
    await postCategory(tokenA, { name: "Shopping", type: "expense" });
    expect(
      await Category.countDocuments({
        user: userAId,
        name: "Shopping",
        type: "expense",
      }),
    ).toBe(1);
  });

  it("allows same name with different type", async () => {
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

  it("returns 400 for whitespace-only name", async () => {
    expect(
      (await postCategory(tokenA, { name: " ", type: "expense" })).status,
    ).toBe(400);
  });

  it("returns 400 for single-character name after trim", async () => {
    expect(
      (await postCategory(tokenA, { name: " A ", type: "expense" })).status,
    ).toBe(400);
  });

  it("returns 400 for missing name", async () => {
    expect((await postCategory(tokenA, { type: "expense" })).status).toBe(400);
  });
  it("returns 400 for missing type", async () => {
    expect((await postCategory(tokenA, { name: "Entertainment" })).status).toBe(
      400,
    );
  });
  it("returns 400 for invalid type value", async () => {
    expect(
      (await postCategory(tokenA, { name: "Misc", type: "transfer" })).status,
    ).toBe(400);
  });
  it("returns 400 for empty name string", async () => {
    expect(
      (await postCategory(tokenA, { name: "", type: "expense" })).status,
    ).toBe(400);
  });
  it("returns 401 without token", async () => {
    expect(
      (
        await request(app)
          .post("/api/categories")
          .send({ name: "Health", type: "expense" })
      ).status,
    ).toBe(401);
  });
});

// ─── DELETE /api/categories/:id ───────────────────────────────────────────────

describe("DELETE /api/categories/:id — cascade", () => {
  it("returns 200 for owner deletion", async () => {
    const cat = await Category.create({
      name: "Dining",
      type: "expense",
      user: userAId,
    });
    const res = await deleteCategory(tokenA, cat._id.toString());
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("removes category from database", async () => {
    const cat = await Category.create({
      name: "Subs",
      type: "expense",
      user: userAId,
    });
    await deleteCategory(tokenA, cat._id.toString());
    expect(await Category.findById(cat._id)).toBeNull();
  });

  it("returns 404 on second delete", async () => {
    const cat = await Category.create({
      name: "Fuel",
      type: "expense",
      user: userAId,
    });
    await deleteCategory(tokenA, cat._id.toString());
    expect((await deleteCategory(tokenA, cat._id.toString())).status).toBe(404);
  });

  it("cascade-deletes associated budgets", async () => {
    const cat = await Category.create({
      name: "Groceries",
      type: "expense",
      user: userAId,
    });
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
    expect(res.body.cascade.budgetsDeleted).toBe(2);
    expect(await Budget.countDocuments({ category: cat._id })).toBe(0);
  });

  it("reports 0 budgetsDeleted when no budgets", async () => {
    const cat = await Category.create({
      name: "Gifts",
      type: "expense",
      user: userAId,
    });
    const res = await deleteCategory(tokenA, cat._id.toString());
    expect(res.body.cascade.budgetsDeleted).toBe(0);
  });

  it("cascade-deactivates active recurring transactions", async () => {
    const cat = await Category.create({
      name: "Internet",
      type: "expense",
      user: userAId,
    });
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
    expect(res.body.cascade.recurringDeactivated).toBe(2);
    expect(
      await RecurringTransaction.countDocuments({
        category: cat._id,
        isActive: true,
      }),
    ).toBe(0);
  });

  it("does not count already-paused recurring as deactivated", async () => {
    const cat = await Category.create({
      name: "Gym",
      type: "expense",
      user: userAId,
    });
    await RecurringTransaction.insertMany([
      {
        user: userAId,
        title: "Active",
        type: "expense",
        amount: 1500,
        category: cat._id,
        frequency: "monthly",
        startDate: new Date(),
        isActive: true,
      },
      {
        user: userAId,
        title: "Paused",
        type: "expense",
        amount: 800,
        category: cat._id,
        frequency: "monthly",
        startDate: new Date(),
        isActive: false,
      },
    ]);
    const res = await deleteCategory(tokenA, cat._id.toString());
    expect(res.body.cascade.recurringDeactivated).toBe(1);
  });

  it("does not delete unrelated category's budgets", async () => {
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
    expect(await Budget.findOne({ category: catToKeep._id })).not.toBeNull();
  });

  it("cascade summary includes both keys", async () => {
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
      title: "Daycare",
      type: "expense",
      amount: 8000,
      category: cat._id,
      frequency: "monthly",
      startDate: new Date(),
      isActive: true,
    });
    const res = await deleteCategory(tokenA, cat._id.toString());
    expect(res.body.cascade).toMatchObject({
      budgetsDeleted: 1,
      recurringDeactivated: 1,
    });
  });

  it("returns 404 when User B tries to delete User A's category", async () => {
    const cat = await Category.create({
      name: "UserAPrivate",
      type: "expense",
      user: userAId,
    });
    expect((await deleteCategory(tokenB, cat._id.toString())).status).toBe(404);
  });

  it("category intact after unauthorized attempt", async () => {
    const cat = await Category.create({
      name: "Protected",
      type: "income",
      user: userAId,
    });
    await deleteCategory(tokenB, cat._id.toString());
    expect(await Category.findById(cat._id)).not.toBeNull();
  });

  it("returns 401 without token", async () => {
    const cat = await Category.create({
      name: "AuthTest",
      type: "expense",
      user: userAId,
    });
    expect(
      (await request(app).delete(`/api/categories/${cat._id}`)).status,
    ).toBe(401);
  });
});
