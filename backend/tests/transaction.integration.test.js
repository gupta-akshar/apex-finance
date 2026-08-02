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

let _dateSeq = 0;
const uniquePastDate = () => {
  const d = new Date(Date.now() - ++_dateSeq * 60_000);
  return d.toISOString();
};

const USER_A = {
  name: "Alice Test",
  email: "alice@example.com",
  password: "securepassA1",
};
const USER_B = {
  name: "Bob Test",
  email: "bob@example.com",
  password: "securepassB1",
};

const registerUser = async (userData) => {
  const res = await request(app).post("/api/auth/register").send(userData);
  if (res.status !== 201)
    throw new Error(`registerUser failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken, userId: res.body.user._id };
};

const getSeededCategory = async (userId, name, type) => {
  const doc = await Category.findOne({
    user: new mongoose.Types.ObjectId(userId),
    name,
    type,
  });
  if (!doc)
    throw new Error(
      `Seeded category "${name}" (${type}) not found for user ${userId}`,
    );
  return doc;
};

const buildPayload = (categoryId, overrides = {}) => ({
  type: "expense",
  amount: 500,
  category: categoryId.toString(),
  note: "Test groceries",
  date: uniquePastDate(),
  paymentMethod: "upi",
  ...overrides,
});

const postTx = (token, body) =>
  request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
const getTxList = (token, query = {}) =>
  request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .query(query);
const putTx = (token, id, body) =>
  request(app)
    .put(`/api/transactions/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
const deleteTx = (token, id) =>
  request(app)
    .delete(`/api/transactions/${id}`)
    .set("Authorization", `Bearer ${token}`);

const bootstrapTwoUsers = async () => {
  const [a, b] = await Promise.all([
    registerUser(USER_A),
    registerUser(USER_B),
  ]);
  const [catA, catB] = await Promise.all([
    getSeededCategory(a.userId, "Food", "expense"),
    getSeededCategory(b.userId, "Food", "expense"),
  ]);
  return {
    tokenA: a.token,
    userAId: a.userId,
    tokenB: b.token,
    userBId: b.userId,
    categoryA: catA,
    categoryB: catB,
  };
};

const teardownAll = () =>
  Promise.all([
    Transaction.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
  ]);

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ─── POST /api/transactions ───────────────────────────────────────────────────

describe("POST /api/transactions — create", () => {
  let tokenA, userAId, categoryA;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    userAId = state.userAId;
    categoryA = state.categoryA;
  });
  afterEach(async () => {
    await Transaction.deleteMany({});
  });
  afterAll(teardownAll);

  it("returns 201 with created transaction", async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({
      type: "expense",
      amount: 500,
    });
  });

  it("scopes transaction to JWT user", async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    const stored = await Transaction.findById(res.body.transaction._id);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("includes budgetWarning and warningMessage in response", async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    expect(typeof res.body.budgetWarning).toBe("boolean");
    expect(typeof res.body.warningMessage).toBe("string");
  });

  it("accepts income type", async () => {
    const salaryCat = await getSeededCategory(userAId, "Salary", "income");
    const res = await postTx(
      tokenA,
      buildPayload(salaryCat._id, { type: "income", amount: 50_000 }),
    );
    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe("income");
  });

  it("rejects amount of 0", async () => {
    expect(
      (await postTx(tokenA, buildPayload(categoryA._id, { amount: 0 }))).status,
    ).toBe(400);
  });

  it("rejects negative amount", async () => {
    expect(
      (await postTx(tokenA, buildPayload(categoryA._id, { amount: -10 })))
        .status,
    ).toBe(400);
  });

  it("rejects Infinity amount", async () => {
    // Infinity serializes to null in JSON — backend should reject null/missing amount
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { amount: 1e309 }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects amount exceeding max", async () => {
    expect(
      (
        await postTx(
          tokenA,
          buildPayload(categoryA._id, { amount: 2_000_000_000 }),
        )
      ).status,
    ).toBe(400);
  });

  it("returns 400 for invalid type", async () => {
    expect(
      (await postTx(tokenA, buildPayload(categoryA._id, { type: "transfer" })))
        .status,
    ).toBe(400);
  });

  it("returns 401 without token", async () => {
    expect(
      (
        await request(app)
          .post("/api/transactions")
          .send(buildPayload(categoryA._id))
      ).status,
    ).toBe(401);
  });
});

// ─── GET /api/transactions ────────────────────────────────────────────────────

describe("GET /api/transactions — list", () => {
  let tokenA, tokenB, userAId, categoryA;
  let seedTxId;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    tokenB = state.tokenB;
    userAId = state.userAId;
    categoryA = state.categoryA;
  });
  beforeEach(async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    seedTxId = res.body.transaction._id;
  });
  afterEach(async () => {
    await Transaction.deleteMany({});
  });
  afterAll(teardownAll);

  it("returns 200 with transactions array and pagination", async () => {
    const res = await getTxList(tokenA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      page: expect.any(Number),
      pages: expect.any(Number),
      limit: expect.any(Number),
    });
  });

  it("pagination total and transaction count are consistent (atomic $facet)", async () => {
    const res = await getTxList(tokenA);
    expect(res.status).toBe(200);
    // FIX: with $facet aggregation these are always consistent
    expect(res.body.pagination.total).toBe(res.body.transactions.length);
  });

  it("populates category with name and type", async () => {
    const res = await getTxList(tokenA);
    const tx = res.body.transactions.find((t) => t._id === seedTxId);
    expect(tx.category).toMatchObject({ name: "Food", type: "expense" });
  });

  it("User B list does not contain User A transaction", async () => {
    const res = await getTxList(tokenB);
    expect(res.body.transactions.map((t) => t._id)).not.toContain(seedTxId);
    expect(res.body.pagination.total).toBe(0);
  });

  it("respects type=income filter", async () => {
    const salaryCat = await getSeededCategory(userAId, "Salary", "income");
    await postTx(tokenA, buildPayload(salaryCat._id, { type: "income" }));
    const res = await getTxList(tokenA, { type: "income" });
    expect(res.status).toBe(200);
    res.body.transactions.forEach((t) => expect(t.type).toBe("income"));
  });

  it("respects limit=1 pagination", async () => {
    await postTx(tokenA, buildPayload(categoryA._id));
    const res = await getTxList(tokenA, { page: 1, limit: 1 });
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.pagination.limit).toBe(1);
  });

  it("sorts by latest by default", async () => {
    await postTx(tokenA, buildPayload(categoryA._id));
    const res = await getTxList(tokenA, { sort: "latest" });
    const dates = res.body.transactions.map((t) => new Date(t.date).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("returns 401 unauthenticated", async () => {
    expect((await request(app).get("/api/transactions")).status).toBe(401);
  });
});

// ─── PUT /api/transactions/:id ────────────────────────────────────────────────

describe("PUT /api/transactions/:id — update", () => {
  let tokenA, tokenB, userAId, categoryA, categoryB;
  let txAId;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    tokenB = state.tokenB;
    userAId = state.userAId;
    categoryA = state.categoryA;
    categoryB = state.categoryB;
  });
  beforeEach(async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    txAId = res.body.transaction._id;
  });
  afterEach(async () => {
    await Transaction.deleteMany({});
  });
  afterAll(teardownAll);

  it("returns 200 with updated fields", async () => {
    const res = await putTx(
      tokenA,
      txAId,
      buildPayload(categoryA._id, { amount: 999, note: "Updated" }),
    );
    expect(res.status).toBe(200);
    expect(res.body.transaction.amount).toBe(999);
    expect(res.body.transaction.note).toBe("Updated");
  });

  it("persists change to database", async () => {
    await putTx(tokenA, txAId, buildPayload(categoryA._id, { amount: 1234 }));
    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(1234);
  });

  it("returns 403 when trying to use another user's category", async () => {
    const res = await putTx(
      tokenA,
      txAId,
      buildPayload(categoryB._id, { amount: 500 }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when User B tries to update User A's transaction", async () => {
    const res = await putTx(
      tokenB,
      txAId,
      buildPayload(categoryB._id, { amount: 9999 }),
    );
    expect(res.status).toBe(404);
  });

  it("does not mutate when unauthorized update attempted", async () => {
    await putTx(tokenB, txAId, buildPayload(categoryB._id, { amount: 9999 }));
    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(500);
  });

  it("returns 400 for invalid type", async () => {
    expect(
      (
        await putTx(
          tokenA,
          txAId,
          buildPayload(categoryA._id, { type: "invalid" }),
        )
      ).status,
    ).toBe(400);
  });

  it("returns 401 unauthenticated", async () => {
    expect(
      (
        await request(app)
          .put(`/api/transactions/${txAId}`)
          .send(buildPayload(categoryA._id))
      ).status,
    ).toBe(401);
  });
});

// ─── DELETE /api/transactions/:id ─────────────────────────────────────────────

describe("DELETE /api/transactions/:id — delete", () => {
  let tokenA, tokenB, categoryA;
  let txAId;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    tokenB = state.tokenB;
    categoryA = state.categoryA;
  });
  beforeEach(async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    txAId = res.body.transaction._id;
  });
  afterEach(async () => {
    await Transaction.deleteMany({});
  });
  afterAll(teardownAll);

  it("returns 200 and removes document", async () => {
    const res = await deleteTx(tokenA, txAId);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    expect(await Transaction.findById(txAId)).toBeNull();
  });

  it("returns 404 when User B tries to delete User A's transaction", async () => {
    expect((await deleteTx(tokenB, txAId)).status).toBe(404);
  });

  it("document still exists after unauthorized delete attempt", async () => {
    await deleteTx(tokenB, txAId);
    expect(await Transaction.findById(txAId)).not.toBeNull();
  });

  it("second delete returns 404", async () => {
    await deleteTx(tokenA, txAId);
    expect((await deleteTx(tokenA, txAId)).status).toBe(404);
  });

  it("returns 401 unauthenticated", async () => {
    expect(
      (await request(app).delete(`/api/transactions/${txAId}`)).status,
    ).toBe(401);
  });
});

// ─── Budget warning integration ────────────────────────────────────────────────

describe("Budget warning on transaction create", () => {
  let tokenA, userAId, categoryA;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    userAId = state.userAId;
    categoryA = state.categoryA;
  });
  afterEach(async () => {
    await Transaction.deleteMany({});
    const Budget = (await import("../src/models/Budget.js")).default;
    await Budget.deleteMany({});
  });
  afterAll(teardownAll);

  it("budgetWarning is false with no budget configured", async () => {
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { amount: 100 }),
    );
    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
    expect(res.body.warningMessage).toBe("");
  });

  it("budgetWarning is true when transaction exceeds budget", async () => {
    const Budget = (await import("../src/models/Budget.js")).default;
    const now = new Date();
    await Budget.create({
      user: new mongoose.Types.ObjectId(userAId),
      category: categoryA._id,
      limit: 200,
      month: now.getUTCMonth() + 1,
      year: now.getUTCFullYear(),
    });

    const txDate = new Date();
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { amount: 300, date: txDate.toISOString() }),
    );
    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(true);
    expect(res.body.warningMessage).toMatch(/exceeded/i);
  });
});
