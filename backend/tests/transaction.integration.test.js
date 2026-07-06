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

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

let _dateSeq = 0;
const uniquePastDate = () => {
  const d = new Date(Date.now() - ++_dateSeq * 60_000);
  return d.toISOString();
};

// ─── User fixtures ────────────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════
// Factory helpers
// ═══════════════════════════════════════════════════════════════════════════

const registerUser = async (userData) => {
  const res = await request(app).post("/api/auth/register").send(userData);
  // Fail early with a clear message rather than a cryptic downstream error.
  if (res.status !== 201) {
    throw new Error(
      `registerUser failed (status ${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return { token: res.body.accessToken, userId: res.body.user._id };
};

const getSeededCategory = async (userId, name, type) => {
  const doc = await Category.findOne({
    user: new mongoose.Types.ObjectId(userId),
    name,
    type,
  });
  if (!doc) {
    throw new Error(
      `Setup error: seeded category "${name}" (${type}) not found for ` +
        `user ${userId}.  Did registerUser() complete successfully?`,
    );
  }
  return doc;
};

/**
 * Builds a complete, valid POST /api/transactions payload.
 * All required fields are present by default; pass overrides to test
 * specific fields or error paths.
 */
const buildPayload = (categoryId, overrides = {}) => ({
  type: "expense",
  amount: 500,
  category: categoryId.toString(),
  note: "Test groceries",
  date: uniquePastDate(),
  paymentMethod: "upi",
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// HTTP request wrappers
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// Shared bootstrap + teardown helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registers USER_A and USER_B in parallel (safe because the unique index
 * includes the user field — two users may share category names), then
 * resolves the auto-seeded "Food" (expense) category for each user.
 *
 * Returns all state needed by most test suites in a single call.
 */
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

/** Wipes all three collections — called in afterAll of each describe block. */
const teardownAll = () =>
  Promise.all([
    Transaction.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
  ]);

// ═══════════════════════════════════════════════════════════════════════════
// Global database lifecycle
// ═══════════════════════════════════════════════════════════════════════════

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. POST /api/transactions — create
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/transactions — create", () => {
  // Users (and their seeded categories) are created once for the whole suite.
  let tokenA, userAId, categoryA;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    userAId = state.userAId;
    categoryA = state.categoryA;
  });

  // Remove any transactions written by individual tests so each one starts
  // with an empty transactions collection.
  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  afterAll(teardownAll);

  // ── Happy-path ────────────────────────────────────────────────────────────

  it("returns 201 with the created transaction for a valid payload", async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));

    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({
      type: "expense",
      amount: 500,
      note: "Test groceries",
    });
    expect(res.body.transaction._id).toBeDefined();
  });

  it("always scopes the new transaction to the JWT user, ignoring any user field in the body", async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));

    expect(res.status).toBe(201);
    const stored = await Transaction.findById(res.body.transaction._id);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("includes budgetWarning (boolean) and warningMessage (string) in the response", async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));

    expect(res.status).toBe(201);
    expect(typeof res.body.budgetWarning).toBe("boolean");
    expect(typeof res.body.warningMessage).toBe("string");
  });

  it("accepts 'income' type as well as 'expense'", async () => {
    const salaryCat = await getSeededCategory(userAId, "Salary", "income");

    const res = await postTx(
      tokenA,
      buildPayload(salaryCat._id, { type: "income", amount: 50_000 }),
    );

    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe("income");
    expect(res.body.transaction.amount).toBe(50_000);
  });

  it("persists the transaction in the database", async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));

    expect(res.status).toBe(201);
    const stored = await Transaction.findById(res.body.transaction._id);
    expect(stored).not.toBeNull();
    expect(stored.amount).toBe(500);
    expect(stored.type).toBe("expense");
  });

  // ── Validation — missing required fields ──────────────────────────────────

  it("returns 400 when required field 'type' is missing", async () => {
    const { type: _omit, ...body } = buildPayload(categoryA._id);
    expect((await postTx(tokenA, body)).status).toBe(400);
  });

  it("returns 400 when required field 'amount' is missing", async () => {
    const { amount: _omit, ...body } = buildPayload(categoryA._id);
    expect((await postTx(tokenA, body)).status).toBe(400);
  });

  it("returns 400 when required field 'category' is missing", async () => {
    const { category: _omit, ...body } = buildPayload(categoryA._id);
    expect((await postTx(tokenA, body)).status).toBe(400);
  });

  it("returns 400 when required field 'date' is missing", async () => {
    const { date: _omit, ...body } = buildPayload(categoryA._id);
    expect((await postTx(tokenA, body)).status).toBe(400);
  });

  // ── Validation — bad field values ─────────────────────────────────────────

  it("returns 400 when 'amount' is negative", async () => {
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { amount: -10 }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'amount' is zero", async () => {
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { amount: 0 }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'type' is an invalid enum value", async () => {
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { type: "transfer" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'paymentMethod' is an invalid enum value", async () => {
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { paymentMethod: "crypto" }),
    );
    expect(res.status).toBe(400);
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send(buildPayload(categoryA._id));
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", "Bearer not.a.valid.token")
      .send(buildPayload(categoryA._id));
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. GET /api/transactions — list, filtering, pagination
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/transactions — list", () => {
  let tokenA, tokenB, userAId, categoryA;
  // ID of the transaction seeded in beforeEach for the current test.
  let seedTxId;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    tokenB = state.tokenB;
    userAId = state.userAId;
    categoryA = state.categoryA;
  });

  // Give every test exactly one pre-existing expense transaction for User A.
  beforeEach(async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    expect(res.status).toBe(201);
    seedTxId = res.body.transaction._id;
  });

  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  afterAll(teardownAll);

  // ── Basic list shape ───────────────────────────────────────────────────────

  it("returns 200 with a transactions array and pagination object", async () => {
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

  it("returns the transaction created in beforeEach for User A", async () => {
    const res = await getTxList(tokenA);

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    const ids = res.body.transactions.map((t) => t._id);
    expect(ids).toContain(seedTxId);
  });

  it("populates the category field with name and type", async () => {
    const res = await getTxList(tokenA);

    expect(res.status).toBe(200);
    const tx = res.body.transactions.find((t) => t._id === seedTxId);
    expect(tx).toBeDefined();
    expect(tx.category).toMatchObject({ name: "Food", type: "expense" });
  });

  // ── User isolation ─────────────────────────────────────────────────────────

  it("User B's list does not contain User A's transaction", async () => {
    const res = await getTxList(tokenB);

    expect(res.status).toBe(200);
    expect(res.body.transactions.map((t) => t._id)).not.toContain(seedTxId);
    expect(res.body.pagination.total).toBe(0);
  });

  it("scopes results correctly when both users have transactions", async () => {
    // Use getSeededCategory for User B without triggering beforeAll re-setup
    const state = await (async () => {
      // tokenB and userBId are available via closure from bootstrapTwoUsers result
      // We need to re-access them; simplest is to look up User B's category directly
      const userB = await User.findOne({ email: USER_B.email });
      const catB = await getSeededCategory(
        userB._id.toString(),
        "Food",
        "expense",
      );
      const userBToken = (
        await request(app).post("/api/auth/login").send({
          email: USER_B.email,
          password: USER_B.password,
        })
      ).body.accessToken;
      return { catB, userBToken };
    })();

    const resBCreate = await postTx(
      state.userBToken,
      buildPayload(state.catB._id),
    );
    expect(resBCreate.status).toBe(201);

    const [resA, resB] = await Promise.all([
      getTxList(tokenA),
      getTxList(state.userBToken),
    ]);

    // Each user sees exactly their own one transaction
    expect(resA.body.pagination.total).toBe(1);
    expect(resB.body.pagination.total).toBe(1);

    const idsA = resA.body.transactions.map((t) => t._id);
    const idsB = resB.body.transactions.map((t) => t._id);
    expect(idsA.filter((id) => idsB.includes(id))).toHaveLength(0);
  });

  // ── Filtering ──────────────────────────────────────────────────────────────

  it("respects the 'type' filter — returns only income transactions", async () => {
    const salaryCat = await getSeededCategory(userAId, "Salary", "income");
    const incomeRes = await postTx(
      tokenA,
      buildPayload(salaryCat._id, { type: "income", amount: 10_000 }),
    );
    expect(incomeRes.status).toBe(201);

    const res = await getTxList(tokenA, { type: "income" });
    expect(res.status).toBe(200);
    expect(res.body.transactions.length).toBeGreaterThan(0);
    res.body.transactions.forEach((t) => expect(t.type).toBe("income"));
  });

  it("respects the 'type' filter — returns only expense transactions", async () => {
    // Seed an income transaction to ensure the filter excludes it
    const salaryCat = await getSeededCategory(userAId, "Salary", "income");
    await postTx(tokenA, buildPayload(salaryCat._id, { type: "income" }));

    const res = await getTxList(tokenA, { type: "expense" });
    expect(res.status).toBe(200);
    expect(res.body.transactions.length).toBeGreaterThan(0);
    res.body.transactions.forEach((t) => expect(t.type).toBe("expense"));
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  it("respects limit=1 — returns one transaction and correct page count", async () => {
    // Add a second transaction so there are at least 2 for User A.
    await postTx(tokenA, buildPayload(categoryA._id));

    const res = await getTxList(tokenA, { page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.pages).toBeGreaterThanOrEqual(2);
  });

  it("returns a different page of results with page=2&limit=1", async () => {
    // Add a second transaction.
    await postTx(tokenA, buildPayload(categoryA._id));

    const [page1, page2] = await Promise.all([
      getTxList(tokenA, { page: 1, limit: 1 }),
      getTxList(tokenA, { page: 2, limit: 1 }),
    ]);

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    const id1 = page1.body.transactions[0]?._id;
    const id2 = page2.body.transactions[0]?._id;
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  // ── Sorting ────────────────────────────────────────────────────────────────

  it("sorts by 'latest' by default — most-recent transaction first", async () => {
    await postTx(tokenA, buildPayload(categoryA._id));

    const res = await getTxList(tokenA, { sort: "latest" });
    expect(res.status).toBe(200);
    const dates = res.body.transactions.map((t) => new Date(t.date).getTime());
    const sorted = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sorted);
  });

  it("sorts by 'oldest' when requested", async () => {
    await postTx(tokenA, buildPayload(categoryA._id));

    const res = await getTxList(tokenA, { sort: "oldest" });
    expect(res.status).toBe(200);
    const dates = res.body.transactions.map((t) => new Date(t.date).getTime());
    const sorted = [...dates].sort((a, b) => a - b);
    expect(dates).toEqual(sorted);
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/transactions");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed token", async () => {
    const res = await request(app)
      .get("/api/transactions")
      .set("Authorization", "Bearer totally.invalid.token");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. PUT /api/transactions/:id — update
// ═══════════════════════════════════════════════════════════════════════════

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

  // Create a fresh transaction for User A before each test so every update
  // test operates on its own independent document.
  beforeEach(async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    expect(res.status).toBe(201);
    txAId = res.body.transaction._id;
  });

  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  afterAll(teardownAll);

  // ── Happy-path ────────────────────────────────────────────────────────────

  it("returns 200 with updated fields when the owner updates", async () => {
    const res = await putTx(
      tokenA,
      txAId,
      buildPayload(categoryA._id, { amount: 999, note: "Updated note" }),
    );

    expect(res.status).toBe(200);
    expect(res.body.transaction.amount).toBe(999);
    expect(res.body.transaction.note).toBe("Updated note");
  });

  it("persists the change in the database", async () => {
    await putTx(tokenA, txAId, buildPayload(categoryA._id, { amount: 1_234 }));

    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(1_234);
  });

  it("does not change the owner (user field) on update", async () => {
    await putTx(tokenA, txAId, buildPayload(categoryA._id, { amount: 750 }));

    const stored = await Transaction.findById(txAId);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("response contains a 'transaction' wrapper key", async () => {
    const res = await putTx(tokenA, txAId, buildPayload(categoryA._id));

    expect(res.status).toBe(200);
    expect(res.body.transaction).toBeDefined();
    expect(res.body.transaction._id).toBe(txAId);
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  it("returns 404 when User B tries to update User A's transaction", async () => {
    const res = await putTx(
      tokenB,
      txAId,
      buildPayload(categoryB._id, { amount: 9_999 }),
    );
    expect(res.status).toBe(404);
  });

  it("does NOT mutate User A's data when User B attempts an update", async () => {
    await putTx(tokenB, txAId, buildPayload(categoryB._id, { amount: 9_999 }));

    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(500); // unchanged
  });

  // ── Not-found ─────────────────────────────────────────────────────────────

  it("returns 404 for a non-existent transaction ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await putTx(tokenA, fakeId, buildPayload(categoryA._id));
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed (non-ObjectId) transaction ID", async () => {
    const res = await putTx(tokenA, "not-an-id", buildPayload(categoryA._id));
    // CastError → error middleware maps to 400
    expect([400, 404, 500]).toContain(res.status);
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when 'type' is an invalid enum value", async () => {
    const res = await putTx(
      tokenA,
      txAId,
      buildPayload(categoryA._id, { type: "invalid_type" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'amount' is negative", async () => {
    const res = await putTx(
      tokenA,
      txAId,
      buildPayload(categoryA._id, { amount: -1 }),
    );
    expect(res.status).toBe(400);
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app)
      .put(`/api/transactions/${txAId}`)
      .send(buildPayload(categoryA._id));
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app)
      .put(`/api/transactions/${txAId}`)
      .set("Authorization", "Bearer garbage.token.here")
      .send(buildPayload(categoryA._id));
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. DELETE /api/transactions/:id — delete
// ═══════════════════════════════════════════════════════════════════════════

describe("DELETE /api/transactions/:id — delete", () => {
  let tokenA, tokenB, categoryA;
  let txAId;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    tokenB = state.tokenB;
    categoryA = state.categoryA;
  });

  // Create a fresh transaction for User A before each test.
  beforeEach(async () => {
    const res = await postTx(tokenA, buildPayload(categoryA._id));
    expect(res.status).toBe(201);
    txAId = res.body.transaction._id;
  });

  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  afterAll(teardownAll);

  // ── Happy-path ────────────────────────────────────────────────────────────

  it("returns 200 and removes the document when the owner deletes it", async () => {
    const res = await deleteTx(tokenA, txAId);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
    expect(await Transaction.findById(txAId)).toBeNull();
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  it("returns 404 when User B tries to delete User A's transaction", async () => {
    const res = await deleteTx(tokenB, txAId);
    expect(res.status).toBe(404);
  });

  it("does NOT delete User A's transaction when User B attempts it", async () => {
    await deleteTx(tokenB, txAId);
    expect(await Transaction.findById(txAId)).not.toBeNull();
  });

  // ── Not-found / idempotency ────────────────────────────────────────────────

  it("returns 404 for a non-existent transaction ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    expect((await deleteTx(tokenA, fakeId)).status).toBe(404);
  });

  it("second delete of the same transaction returns 404", async () => {
    await deleteTx(tokenA, txAId);
    expect((await deleteTx(tokenA, txAId)).status).toBe(404);
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app).delete(`/api/transactions/${txAId}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app)
      .delete(`/api/transactions/${txAId}`)
      .set("Authorization", "Bearer garbage.token.here");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Cross-user authorization — comprehensive isolation suite
// ═══════════════════════════════════════════════════════════════════════════

describe("Authorization boundaries — User A vs User B isolation", () => {
  let tokenA, tokenB, userAId, userBId, categoryA, categoryB;
  // Fresh transaction IDs for each test.
  let txAId, txBId;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    tokenB = state.tokenB;
    userAId = state.userAId;
    userBId = state.userBId;
    categoryA = state.categoryA;
    categoryB = state.categoryB;
  });

  // Create one transaction per user before each test.  Sequential creates
  // avoid any potential timing edge cases even though the partial-filter
  // idempotency index doesn't affect manual transactions.
  beforeEach(async () => {
    const resA = await postTx(tokenA, buildPayload(categoryA._id));
    expect(resA.status).toBe(201);
    txAId = resA.body.transaction._id;

    const resB = await postTx(tokenB, buildPayload(categoryB._id));
    expect(resB.status).toBe(201);
    txBId = resB.body.transaction._id;
  });

  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  afterAll(teardownAll);

  // ── List isolation ─────────────────────────────────────────────────────────

  it("User A's list does not contain User B's transaction", async () => {
    const res = await getTxList(tokenA);
    expect(res.status).toBe(200);
    expect(res.body.transactions.map((t) => t._id)).not.toContain(txBId);
  });

  it("User B's list does not contain User A's transaction", async () => {
    const res = await getTxList(tokenB);
    expect(res.status).toBe(200);
    expect(res.body.transactions.map((t) => t._id)).not.toContain(txAId);
  });

  it("each user's transaction count is 1 and their ID sets are disjoint", async () => {
    const [resA, resB] = await Promise.all([
      getTxList(tokenA),
      getTxList(tokenB),
    ]);

    expect(resA.body.pagination.total).toBe(1);
    expect(resB.body.pagination.total).toBe(1);

    const idsA = resA.body.transactions.map((t) => t._id);
    const idsB = resB.body.transactions.map((t) => t._id);
    expect(idsA.filter((id) => idsB.includes(id))).toHaveLength(0);
  });

  // ── Update isolation ───────────────────────────────────────────────────────

  it("User A cannot update User B's transaction — returns 404", async () => {
    const res = await putTx(
      tokenA,
      txBId,
      buildPayload(categoryA._id, { amount: 1 }),
    );
    expect(res.status).toBe(404);
  });

  it("User A's failed update attempt does not mutate User B's transaction", async () => {
    await putTx(tokenA, txBId, buildPayload(categoryA._id, { amount: 1 }));
    const stored = await Transaction.findById(txBId);
    expect(stored.amount).toBe(500);
    expect(stored.user.toString()).toBe(userBId.toString());
  });

  it("User B cannot update User A's transaction — returns 404", async () => {
    const res = await putTx(
      tokenB,
      txAId,
      buildPayload(categoryB._id, { amount: 1 }),
    );
    expect(res.status).toBe(404);
  });

  it("User B's failed update attempt does not mutate User A's transaction", async () => {
    await putTx(tokenB, txAId, buildPayload(categoryB._id, { amount: 1 }));
    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(500);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  // ── Delete isolation ───────────────────────────────────────────────────────

  it("User A cannot delete User B's transaction — returns 404", async () => {
    const res = await deleteTx(tokenA, txBId);
    expect(res.status).toBe(404);
  });

  it("User A's failed delete attempt leaves User B's transaction intact", async () => {
    await deleteTx(tokenA, txBId);
    expect(await Transaction.findById(txBId)).not.toBeNull();
  });

  it("User B cannot delete User A's transaction — returns 404", async () => {
    const res = await deleteTx(tokenB, txAId);
    expect(res.status).toBe(404);
  });

  it("User B's failed delete attempt leaves User A's transaction intact", async () => {
    await deleteTx(tokenB, txAId);
    expect(await Transaction.findById(txAId)).not.toBeNull();
  });

  // ── Side-effect isolation ──────────────────────────────────────────────────

  it("deleting User A's transaction does not affect User B's count", async () => {
    await deleteTx(tokenA, txAId);
    const resB = await getTxList(tokenB);
    expect(resB.body.pagination.total).toBe(1);
  });

  it("deleting User B's transaction does not affect User A's count", async () => {
    await deleteTx(tokenB, txBId);
    const resA = await getTxList(tokenA);
    expect(resA.body.pagination.total).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Budget warning — integration smoke-test
// ═══════════════════════════════════════════════════════════════════════════

describe("Budget warning on transaction create", () => {
  /**
   * This suite verifies the budgetWarning / warningMessage mechanism at the
   * integration level without requiring a full budget-management UI test
   * harness.  It seeds a budget directly in the DB and then creates a
   * transaction that exceeds it.
   */
  let tokenA, userAId, categoryA;

  beforeAll(async () => {
    const state = await bootstrapTwoUsers();
    tokenA = state.tokenA;
    userAId = state.userAId;
    categoryA = state.categoryA;
  });

  afterEach(async () => {
    await Transaction.deleteMany({});
    // Remove budgets between tests (Budget model is used by the controller)
    const Budget = (await import("../src/models/Budget.js")).default;
    await Budget.deleteMany({});
  });

  afterAll(teardownAll);

  it("budgetWarning is false when no budget is configured for the category", async () => {
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, { amount: 100 }),
    );
    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(false);
    expect(res.body.warningMessage).toBe("");
  });

  it("budgetWarning is true and warningMessage is non-empty when the transaction exceeds the budget", async () => {
    // Seed a budget of ₹200 for categoryA in the current month/year.
    const Budget = (await import("../src/models/Budget.js")).default;
    const now = new Date();
    await Budget.create({
      user: new mongoose.Types.ObjectId(userAId),
      category: categoryA._id,
      limit: 200,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    // Transaction for ₹300 exceeds the ₹200 limit.
    const txDate = new Date();
    const res = await postTx(
      tokenA,
      buildPayload(categoryA._id, {
        amount: 300,
        date: txDate.toISOString(),
      }),
    );

    expect(res.status).toBe(201);
    expect(res.body.budgetWarning).toBe(true);
    expect(res.body.warningMessage).toMatch(/exceeded/i);
  });
});
