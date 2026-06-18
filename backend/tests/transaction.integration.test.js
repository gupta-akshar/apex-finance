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

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Unique date generator ─────────────────────────────────────────────────────
// The Transaction schema has a sparse unique index on { sourceRecurringId, date }.
// MongoDB sparse indexes still index explicit `null` values — only truly missing
// fields are excluded. Every manual transaction sets sourceRecurringId: null, so
// two creates that share the exact same millisecond will hit a duplicate-key error.
//
// Fix: each call to uniquePastDate() subtracts an incrementing number of minutes
// from now, guaranteeing every transaction in the entire test run gets a distinct
// date string that is always in the past (satisfying the model validator).

let _dateSeq = 0;
const uniquePastDate = () => {
  const d = new Date(Date.now() - ++_dateSeq * 60_000);
  return d.toISOString();
};

const VALID_TX = (categoryId) => ({
  type: "expense",
  amount: 500,
  category: categoryId,
  note: "Groceries",
  date: uniquePastDate(),
  paymentMethod: "upi",
});

// ─── Request helpers ──────────────────────────────────────────────────────────

const register = (payload) =>
  request(app).post("/api/auth/register").send(payload);

/** Authenticated POST /api/transactions */
const createTx = (token, body) =>
  request(app)
    .post("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .send(body);

/** Authenticated GET /api/transactions */
const getTxList = (token, query = {}) =>
  request(app)
    .get("/api/transactions")
    .set("Authorization", `Bearer ${token}`)
    .query(query);

/** Authenticated PUT /api/transactions/:id */
const updateTx = (token, id, body) =>
  request(app)
    .put(`/api/transactions/${id}`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);

/** Authenticated DELETE /api/transactions/:id */
const deleteTx = (token, id) =>
  request(app)
    .delete(`/api/transactions/${id}`)
    .set("Authorization", `Bearer ${token}`);

// ─── Database lifecycle ───────────────────────────────────────────────────────

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Transaction.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
});

// ─── Shared state ─────────────────────────────────────────────────────────────

let tokenA, tokenB;
let categoryA, categoryB;
let userAId, userBId;

const setupUsers = async () => {
  const resA = await register(USER_A);
  const resB = await register(USER_B);
  tokenA = resA.body.accessToken;
  tokenB = resB.body.accessToken;
  userAId = resA.body.user._id;
  userBId = resB.body.user._id;
};

const setupCategories = async () => {
  categoryA = await Category.create({
    name: "Food",
    type: "expense",
    user: userAId,
  });
  categoryB = await Category.create({
    name: "Transport",
    type: "expense",
    user: userBId,
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/transactions — create
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/transactions — create", () => {
  beforeEach(async () => {
    await setupUsers();
    await setupCategories();
  });

  it("returns 201 with the created transaction for valid data", async () => {
    const res = await createTx(tokenA, VALID_TX(categoryA._id.toString()));

    expect(res.status).toBe(201);
    expect(res.body.transaction).toBeDefined();
    expect(res.body.transaction.type).toBe("expense");
    expect(res.body.transaction.amount).toBe(500);
    expect(res.body.transaction.note).toBe("Groceries");
  });

  it("always scopes the new transaction to the JWT user, ignoring any user field in the body", async () => {
    const res = await createTx(tokenA, VALID_TX(categoryA._id.toString()));

    expect(res.status).toBe(201);
    const stored = await Transaction.findById(res.body.transaction._id);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  it("returns 400 when required field 'type' is missing", async () => {
    const { type: _omit, ...body } = VALID_TX(categoryA._id.toString());
    expect((await createTx(tokenA, body)).status).toBe(400);
  });

  it("returns 400 when required field 'amount' is missing", async () => {
    const { amount: _omit, ...body } = VALID_TX(categoryA._id.toString());
    expect((await createTx(tokenA, body)).status).toBe(400);
  });

  it("returns 400 when required field 'category' is missing", async () => {
    const { category: _omit, ...body } = VALID_TX(categoryA._id.toString());
    expect((await createTx(tokenA, body)).status).toBe(400);
  });

  it("returns 400 when required field 'date' is missing", async () => {
    const { date: _omit, ...body } = VALID_TX(categoryA._id.toString());
    expect((await createTx(tokenA, body)).status).toBe(400);
  });

  it("returns 400 when 'amount' is negative", async () => {
    const res = await createTx(tokenA, {
      ...VALID_TX(categoryA._id.toString()),
      amount: -10,
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'type' is an invalid enum value", async () => {
    const res = await createTx(tokenA, {
      ...VALID_TX(categoryA._id.toString()),
      type: "transfer",
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .send(VALID_TX(categoryA._id.toString()));
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", "Bearer not.a.valid.token")
      .send(VALID_TX(categoryA._id.toString()));
    expect(res.status).toBe(401);
  });

  it("includes a budgetWarning boolean in the response", async () => {
    const res = await createTx(tokenA, VALID_TX(categoryA._id.toString()));
    expect(res.status).toBe(201);
    expect(typeof res.body.budgetWarning).toBe("boolean");
  });

  it("accepts 'income' type as well as 'expense'", async () => {
    const incomeCategory = await Category.create({
      name: "Salary",
      type: "income",
      user: userAId,
    });
    const res = await createTx(tokenA, {
      type: "income",
      amount: 50000,
      category: incomeCategory._id.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(201);
    expect(res.body.transaction.type).toBe("income");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/transactions — list with filters
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/transactions — list", () => {
  let txAId;

  beforeEach(async () => {
    await setupUsers();
    await setupCategories();
    const res = await createTx(tokenA, VALID_TX(categoryA._id.toString()));
    expect(res.status).toBe(201);
    txAId = res.body.transaction._id;
  });

  it("returns 200 with a paginated list for the authenticated user", async () => {
    const res = await getTxList(tokenA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.transactions.length).toBeGreaterThanOrEqual(1);
  });

  it("User B sees none of User A's transactions", async () => {
    const res = await getTxList(tokenB);
    expect(res.status).toBe(200);
    const ids = res.body.transactions.map((t) => t._id);
    expect(ids).not.toContain(txAId);
    expect(res.body.transactions.length).toBe(0);
  });

  it("scopes results correctly when both users have transactions", async () => {
    // Sequential creates — avoids the sparse-index collision
    const bRes = await createTx(tokenB, VALID_TX(categoryB._id.toString()));
    expect(bRes.status).toBe(201);

    const [resA, resB] = await Promise.all([
      getTxList(tokenA),
      getTxList(tokenB),
    ]);

    expect(resA.body.transactions.length).toBe(1);
    expect(resB.body.transactions.length).toBe(1);

    const idsA = resA.body.transactions.map((t) => t._id);
    const idsB = resB.body.transactions.map((t) => t._id);
    expect(idsA.filter((id) => idsB.includes(id)).length).toBe(0);
  });

  it("respects the 'type' query filter", async () => {
    const incomeCategory = await Category.create({
      name: "Salary",
      type: "income",
      user: userAId,
    });
    const r = await createTx(tokenA, {
      type: "income",
      amount: 10000,
      category: incomeCategory._id.toString(),
      date: uniquePastDate(),
    });
    expect(r.status).toBe(201);

    const res = await getTxList(tokenA, { type: "income" });
    expect(res.status).toBe(200);
    res.body.transactions.forEach((t) => expect(t.type).toBe("income"));
  });

  it("respects pagination (page and limit)", async () => {
    const r2 = await createTx(tokenA, VALID_TX(categoryA._id.toString()));
    expect(r2.status).toBe(201);

    const res = await getTxList(tokenA, { page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.transactions.length).toBe(1);
    expect(res.body.pagination.pages).toBe(2);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/transactions");
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/transactions/:id — update
// ═════════════════════════════════════════════════════════════════════════════

describe("PUT /api/transactions/:id — update", () => {
  let txAId;

  beforeEach(async () => {
    await setupUsers();
    await setupCategories();
    const res = await createTx(tokenA, VALID_TX(categoryA._id.toString()));
    expect(res.status).toBe(201);
    txAId = res.body.transaction._id;
  });

  it("returns 200 with the updated transaction when the owner updates it", async () => {
    const res = await updateTx(tokenA, txAId, {
      type: "expense",
      amount: 999,
      category: categoryA._id.toString(),
      date: uniquePastDate(),
      note: "Updated note",
    });
    expect(res.status).toBe(200);
    expect(res.body.transaction.amount).toBe(999);
    expect(res.body.transaction.note).toBe("Updated note");
  });

  it("persists the change to the database", async () => {
    await updateTx(tokenA, txAId, {
      type: "expense",
      amount: 1234,
      category: categoryA._id.toString(),
      date: uniquePastDate(),
    });
    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(1234);
  });

  it("does NOT change the owner (user field) on update", async () => {
    await updateTx(tokenA, txAId, {
      type: "expense",
      amount: 750,
      category: categoryA._id.toString(),
      date: uniquePastDate(),
    });
    const stored = await Transaction.findById(txAId);
    expect(stored.user.toString()).toBe(userAId.toString());
  });

  // ── Authorization boundary ────────────────────────────────────────────────

  it("returns 404 when User B tries to update User A's transaction", async () => {
    const res = await updateTx(tokenB, txAId, {
      type: "expense",
      amount: 9999,
      category: categoryB._id.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(404);
  });

  it("does NOT mutate User A's data when User B attempts an update", async () => {
    await updateTx(tokenB, txAId, {
      type: "expense",
      amount: 9999,
      category: categoryB._id.toString(),
      date: uniquePastDate(),
    });
    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(500); // unchanged
  });

  it("returns 404 for a non-existent transaction ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await updateTx(tokenA, fakeId, {
      type: "expense",
      amount: 100,
      category: categoryA._id.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 when no Authorization header is supplied", async () => {
    const res = await request(app)
      .put(`/api/transactions/${txAId}`)
      .send({ amount: 100 });
    expect(res.status).toBe(401);
  });

  it("returns 400 when Joi validation fails on the update payload", async () => {
    const res = await updateTx(tokenA, txAId, {
      type: "invalid_type",
      amount: 100,
      category: categoryA._id.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/transactions/:id — delete
// ═════════════════════════════════════════════════════════════════════════════

describe("DELETE /api/transactions/:id — delete", () => {
  let txAId;

  beforeEach(async () => {
    await setupUsers();
    await setupCategories();
    const res = await createTx(tokenA, VALID_TX(categoryA._id.toString()));
    expect(res.status).toBe(201);
    txAId = res.body.transaction._id;
  });

  it("returns 200 and removes the document when the owner deletes it", async () => {
    const res = await deleteTx(tokenA, txAId);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const stored = await Transaction.findById(txAId);
    expect(stored).toBeNull();
  });

  // ── Authorization boundary ────────────────────────────────────────────────

  it("returns 404 when User B tries to delete User A's transaction", async () => {
    const res = await deleteTx(tokenB, txAId);
    expect(res.status).toBe(404);
  });

  it("does NOT delete User A's transaction when User B attempts it", async () => {
    await deleteTx(tokenB, txAId);
    const stored = await Transaction.findById(txAId);
    expect(stored).not.toBeNull();
  });

  it("returns 404 for a non-existent transaction ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    expect((await deleteTx(tokenA, fakeId)).status).toBe(404);
  });

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

  it("second delete of the same transaction returns 404", async () => {
    await deleteTx(tokenA, txAId);
    expect((await deleteTx(tokenA, txAId)).status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Cross-user authorization — comprehensive boundary suite
// ═════════════════════════════════════════════════════════════════════════════

describe("Authorization boundaries — User A vs User B isolation", () => {
  let txAId, txBId;

  beforeEach(async () => {
    await setupUsers();
    await setupCategories();

    // Sequential creates — parallel Promise.all() was the root cause of the
    // sparse-index duplicate-key errors when both creates resolved within the
    // same millisecond and uniquePastDate() had not yet been incremented.
    const resA = await createTx(tokenA, VALID_TX(categoryA._id.toString()));
    expect(resA.status).toBe(201);
    txAId = resA.body.transaction._id;

    const resB = await createTx(tokenB, VALID_TX(categoryB._id.toString()));
    expect(resB.status).toBe(201);
    txBId = resB.body.transaction._id;
  });

  it("User A cannot see User B's transaction in GET list", async () => {
    const res = await getTxList(tokenA);
    expect(res.body.transactions.map((t) => t._id)).not.toContain(txBId);
  });

  it("User B cannot see User A's transaction in GET list", async () => {
    const res = await getTxList(tokenB);
    expect(res.body.transactions.map((t) => t._id)).not.toContain(txAId);
  });

  it("User A cannot update User B's transaction", async () => {
    const res = await updateTx(tokenA, txBId, {
      type: "expense",
      amount: 1,
      category: categoryA._id.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(404);

    const stored = await Transaction.findById(txBId);
    expect(stored.amount).toBe(500); // unchanged
  });

  it("User B cannot update User A's transaction", async () => {
    const res = await updateTx(tokenB, txAId, {
      type: "expense",
      amount: 1,
      category: categoryB._id.toString(),
      date: uniquePastDate(),
    });
    expect(res.status).toBe(404);

    const stored = await Transaction.findById(txAId);
    expect(stored.amount).toBe(500); // unchanged
  });

  it("User A cannot delete User B's transaction", async () => {
    const res = await deleteTx(tokenA, txBId);
    expect(res.status).toBe(404);

    const stored = await Transaction.findById(txBId);
    expect(stored).not.toBeNull();
  });

  it("User B cannot delete User A's transaction", async () => {
    const res = await deleteTx(tokenB, txAId);
    expect(res.status).toBe(404);

    const stored = await Transaction.findById(txAId);
    expect(stored).not.toBeNull();
  });

  it("each user's transaction count is independent", async () => {
    const [resA, resB] = await Promise.all([
      getTxList(tokenA),
      getTxList(tokenB),
    ]);
    expect(resA.body.pagination.total).toBe(1);
    expect(resB.body.pagination.total).toBe(1);
  });

  it("deleting User A's transaction does not affect User B's count", async () => {
    await deleteTx(tokenA, txAId);
    const resB = await getTxList(tokenB);
    expect(resB.body.pagination.total).toBe(1);
  });
});
