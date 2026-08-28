jest.mock("express-rate-limit", () => () => (_req, _res, next) => next());

process.env.JWT_ACCESS_SECRET = "test_access_secret_must_be_32_plus_chars_ok";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_plus_chars_ok_xxxxx";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:5173";

import request from "supertest";
import crypto from "crypto";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import User from "../src/models/User.js";

const JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const BASE_USER = {
  name: "Jane Doe",
  email: "jane@example.com",
  password: "securepass1",
};

const register = (payload = {}) =>
  request(app)
    .post("/api/auth/register")
    .send({ ...BASE_USER, ...payload });

const login = (payload = {}) =>
  request(app)
    .post("/api/auth/login")
    .send({ email: BASE_USER.email, password: BASE_USER.password, ...payload });

const getRefreshCookie = (res) => {
  const header = res.headers["set-cookie"];
  if (!header) return null;
  const all = Array.isArray(header) ? header : [header];
  return all.find((c) => c.startsWith("refreshToken=")) ?? null;
};

const cookieHeader = (rawSetCookie) => rawSetCookie.split(";")[0].trim();

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
  await User.deleteMany({});
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 201 with accessToken, user shape, and refresh cookie", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toMatch(JWT_PATTERN);
    expect(res.body.user).toMatchObject({
      name: BASE_USER.name,
      email: BASE_USER.email,
    });
    expect(res.body.user).toHaveProperty("_id");
    expect(res.body.user.password).toBeUndefined();
    expect(getRefreshCookie(res)).not.toBeNull();
  });

  it("stores a hashed refresh token, not the raw JWT", async () => {
    const res = await register();
    const rawCookie = getRefreshCookie(res);
    const rawToken = cookieHeader(rawCookie).replace("refreshToken=", "");

    const user = await User.findOne({ email: BASE_USER.email }).select(
      "+refreshTokenHash",
    );
    expect(user.refreshTokenHash).toBe(hashToken(rawToken));
    // Stored value must NOT equal the raw token
    expect(user.refreshTokenHash).not.toBe(rawToken);
    // Old plaintext field must not exist on the model
    expect(user.refreshToken).toBeUndefined();
  });

  it("seeds 7 default categories on registration", async () => {
    // Verify seeding indirectly via the categories endpoint
    const res = await register();
    const catRes = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(catRes.status).toBe(200);
    expect(catRes.body.length).toBe(7);
  });

  it("returns 400 for duplicate email", async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("returns 400 when name is shorter than 2 characters", async () => {
    expect((await register({ name: "X" })).status).toBe(400);
  });

  it("returns 400 when password is shorter than 6 characters", async () => {
    expect((await register({ password: "abc" })).status).toBe(400);
  });

  it("returns 400 when email format is invalid", async () => {
    expect((await register({ email: "not-an-email" })).status).toBe(400);
  });

  it("does not expose password hash in response", async () => {
    const res = await register();
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.refreshTokenHash).toBeUndefined();
  });
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await register();
  });

  it("returns 200 with accessToken and refresh cookie on valid credentials", async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toMatch(JWT_PATTERN);
    expect(getRefreshCookie(res)).not.toBeNull();
  });

  it("returns the authenticated user shape without sensitive fields", async () => {
    const res = await login();
    expect(res.body.user).toMatchObject({ email: BASE_USER.email });
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.refreshTokenHash).toBeUndefined();
  });

  it("returns 401 on wrong password", async () => {
    expect((await login({ password: "wrongpassword" })).status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    expect((await login({ email: "nobody@example.com" })).status).toBe(401);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: BASE_USER.email });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: BASE_USER.password });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  it("returns 200 with new accessToken and rotated refresh cookie", async () => {
    await register();
    const loginRes = await login();
    const originalToken = loginRes.body.accessToken;
    const originalCookie = getRefreshCookie(loginRes);

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(originalCookie));

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toMatch(JWT_PATTERN);
    expect(refreshRes.body.accessToken).not.toBe(originalToken);
    expect(getRefreshCookie(refreshRes)).not.toBeNull();
    expect(cookieHeader(getRefreshCookie(refreshRes))).not.toBe(
      cookieHeader(originalCookie),
    );
  });

  it("returns 401 when no refresh cookie is present", async () => {
    expect((await request(app).post("/api/auth/refresh")).status).toBe(401);
  });

  it("returns 403 for a tampered token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=totally.fake.token");
    expect(res.status).toBe(403);
  });

  it("returns 403 when a rotated (stale) token is replayed — atomic rotation", async () => {
    await register();
    const loginRes = await login();
    const firstCookie = getRefreshCookie(loginRes);

    // First refresh — rotates the token
    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(firstCookie));

    // Replay the original cookie — must fail
    const replayRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(firstCookie));

    expect(replayRes.status).toBe(403);
    expect(replayRes.body.message).toMatch(/invalid refresh token/i);
  });

  it("issues a new refresh cookie that is itself valid", async () => {
    await register();
    const loginRes = await login();
    const firstCookie = getRefreshCookie(loginRes);

    const refreshRes1 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(firstCookie));
    expect(refreshRes1.status).toBe(200);

    const secondCookie = getRefreshCookie(refreshRes1);
    const refreshRes2 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(secondCookie));
    expect(refreshRes2.status).toBe(200);
    expect(refreshRes2.body.accessToken).toMatch(JWT_PATTERN);
  });
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  it("returns 200 and clears the refresh cookie", async () => {
    await register();
    const loginRes = await login();
    const cookie = getRefreshCookie(loginRes);

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader(cookie));

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
    const clearedCookie = getRefreshCookie(logoutRes);
    expect(clearedCookie).not.toBeNull();
    expect(cookieHeader(clearedCookie)).toBe("refreshToken=");
  });

  it("makes the refresh token unusable after logout", async () => {
    await register();
    const loginRes = await login();
    const cookie = getRefreshCookie(loginRes);
    await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader(cookie));
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookie));
    expect(refreshRes.status).toBeGreaterThanOrEqual(401);
  });

  it("returns 200 gracefully with no refresh cookie", async () => {
    expect((await request(app).post("/api/auth/logout")).status).toBe(200);
  });

  it("nullifies the refreshTokenHash in the database on logout", async () => {
    await register();
    const loginRes = await login();
    const cookie = getRefreshCookie(loginRes);
    await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader(cookie));
    const user = await User.findOne({ email: BASE_USER.email }).select(
      "+refreshTokenHash",
    );
    expect(user.refreshTokenHash).toBeNull();
  });
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns 200 with authenticated user", async () => {
    await register();
    const {
      body: { accessToken },
    } = await login();
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: BASE_USER.email });
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.refreshTokenHash).toBeUndefined();
  });

  it("returns 401 with no token", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });

  it("returns 401 for malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.real.token");
    expect(res.status).toBe(401);
  });

  it("returns 401 for expired/tampered token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set(
        "Authorization",
        "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UifQ.invalidsig",
      );
    expect(res.status).toBe(401);
  });
});

// ─── Concurrent refresh — race condition safety ───────────────────────────────

describe("Concurrent refresh token rotation — race condition safety", () => {
  it("only one of two concurrent refresh requests succeeds", async () => {
    await register();
    const loginRes = await login();
    const cookie = getRefreshCookie(loginRes);

    // Fire two refresh requests simultaneously with the same token
    const [res1, res2] = await Promise.all([
      request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookieHeader(cookie)),
      request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookieHeader(cookie)),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must succeed (200), one must fail (403) — atomic update ensures this
    expect(statuses).toEqual([200, 403]);
  });
});

// ─── Refresh token rotation security ─────────────────────────────────────────

describe("Refresh token rotation", () => {
  it("invalidates the previous token after rotation", async () => {
    await register();
    const loginRes = await login();
    const cookieA = getRefreshCookie(loginRes);

    const refreshRes1 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieA));
    expect(refreshRes1.status).toBe(200);
    const cookieB = getRefreshCookie(refreshRes1);

    const refreshRes2 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieB));
    expect(refreshRes2.status).toBe(200);

    // Replaying original token A must fail
    expect(
      (
        await request(app)
          .post("/api/auth/refresh")
          .set("Cookie", cookieHeader(cookieA))
      ).status,
    ).toBe(403);
    // Replaying intermediate token B must fail
    expect(
      (
        await request(app)
          .post("/api/auth/refresh")
          .set("Cookie", cookieHeader(cookieB))
      ).status,
    ).toBe(403);
  });

  it("stores only the latest hash in the database after rotation", async () => {
    await register();
    const loginRes = await login();
    const cookieA = getRefreshCookie(loginRes);
    const tokenA = cookieHeader(cookieA).replace("refreshToken=", "");

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieA));
    expect(refreshRes.status).toBe(200);
    const cookieB = getRefreshCookie(refreshRes);
    const tokenB = cookieHeader(cookieB).replace("refreshToken=", "");

    const user = await User.findOne({ email: BASE_USER.email }).select(
      "+refreshTokenHash",
    );
    // DB should contain hash of tokenB, not tokenA or plaintext
    expect(user.refreshTokenHash).toBe(hashToken(tokenB));
    expect(user.refreshTokenHash).not.toBe(hashToken(tokenA));
    expect(user.refreshTokenHash).not.toBe(tokenB);
  });
});
