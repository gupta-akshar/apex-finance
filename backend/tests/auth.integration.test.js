// ─── Mock rate limiter before any app module is loaded ───────────────────────
// express-rate-limit uses an in-memory store that persists for the lifetime of
// the process.  Mocking it here prevents login/register calls from tripping
// thresholds inside the test suite without touching production code.
jest.mock("express-rate-limit", () => () => (_req, _res, next) => next());

// ─── Environment variables (must precede app import) ─────────────────────────
// JWT helpers and middleware read these at call time, so setting them here
// (before the first require() of app.js) is sufficient with babel-jest.
process.env.JWT_ACCESS_SECRET = "test_access_secret_must_be_32_plus_chars_ok";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_32_plus_chars_ok_xxxxx";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:5173";

import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import User from "../src/models/User.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

const BASE_USER = {
  name: "Jane Doe",
  email: "jane@example.com",
  password: "securepass1",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** POST /api/auth/register */
const register = (payload = {}) =>
  request(app)
    .post("/api/auth/register")
    .send({ ...BASE_USER, ...payload });

/** POST /api/auth/login */
const login = (payload = {}) =>
  request(app)
    .post("/api/auth/login")
    .send({
      email: BASE_USER.email,
      password: BASE_USER.password,
      ...payload,
    });

/**
 * Returns the raw Set-Cookie header string for the refreshToken cookie,
 * or null when absent.  Works regardless of whether the header is a string
 * or an array (supertest normalises it to an array).
 */
const getRefreshCookie = (res) => {
  const header = res.headers["set-cookie"];
  if (!header) return null;
  const all = Array.isArray(header) ? header : [header];
  return all.find((c) => c.startsWith("refreshToken=")) ?? null;
};

/**
 * Extracts the "refreshToken=<value>" name=value pair from the full cookie
 * string so it can be forwarded via the Cookie request header.
 */
const cookieHeader = (rawSetCookie) => rawSetCookie.split(";")[0].trim(); // "refreshToken=<jwt>"

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

// Guarantee test isolation: each test starts with an empty users collection.
afterEach(async () => {
  await User.deleteMany({});
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/register", () => {
  it("returns 201 with accessToken, user shape, and refresh cookie on valid data", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Access token must be a well-formed JWT
    expect(res.body.accessToken).toMatch(JWT_PATTERN);

    // User object must expose safe fields only — no password
    expect(res.body.user).toMatchObject({
      name: BASE_USER.name,
      email: BASE_USER.email,
    });
    expect(res.body.user).toHaveProperty("_id");
    expect(res.body.user.password).toBeUndefined();

    // httpOnly refresh cookie must be set
    expect(getRefreshCookie(res)).not.toBeNull();
  });

  it("returns 400 when the email address is already registered", async () => {
    await register(); // first registration succeeds
    const res = await register(); // duplicate

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("returns 400 when name is shorter than 2 characters", async () => {
    const res = await register({ name: "X" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is shorter than 6 characters", async () => {
    const res = await register({ password: "abc" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await register({ email: "not-an-email" });

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Every login test needs a pre-existing user account.
    await register();
  });

  it("returns 200 with accessToken and refresh cookie on valid credentials", async () => {
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toMatch(JWT_PATTERN);
    expect(res.body.user).toMatchObject({ email: BASE_USER.email });
    expect(getRefreshCookie(res)).not.toBeNull();
  });

  it("returns 401 when the password is incorrect", async () => {
    const res = await login({ password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it("returns 401 when the email is not registered", async () => {
    const res = await login({ email: "nobody@example.com" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: BASE_USER.email }); // password omitted

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/refresh
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/refresh", () => {
  it("returns 200 with a new accessToken and rotates the refresh cookie", async () => {
    await register();
    const loginRes = await login();
    const originalToken = loginRes.body.accessToken;
    const originalCookie = getRefreshCookie(loginRes);

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(originalCookie));

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);

    // Access token must be a valid JWT and must differ from the original
    expect(refreshRes.body.accessToken).toMatch(JWT_PATTERN);
    expect(refreshRes.body.accessToken).not.toBe(originalToken);

    // A new refresh cookie must be issued (token rotation)
    const newCookie = getRefreshCookie(refreshRes);
    expect(newCookie).not.toBeNull();
    expect(cookieHeader(newCookie)).not.toBe(cookieHeader(originalCookie));
  });

  it("returns 401 when no refresh cookie is present", async () => {
    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(401);
  });

  it("returns 403 when the refresh cookie contains a tampered token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=totally.fake.token");

    expect(res.status).toBe(403);
  });

  it("returns 403 when a valid but already-rotated token is replayed", async () => {
    await register();
    const loginRes = await login();
    const firstCookie = getRefreshCookie(loginRes);

    // First refresh — rotates the token; firstCookie is now invalid in the DB
    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(firstCookie));

    // Replay the original (pre-rotation) cookie
    const replayRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(firstCookie));

    expect(replayRes.status).toBe(403);
    expect(replayRes.body.message).toMatch(/invalid refresh token/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ═════════════════════════════════════════════════════════════════════════════

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

    // The Set-Cookie header must clear the refreshToken
    // Express clearCookie() sets the value to an empty string and the expiry
    // to the Unix epoch, e.g. "refreshToken=; Path=/; Expires=Thu, 01 Jan 1970"
    const clearedCookie = getRefreshCookie(logoutRes);
    expect(clearedCookie).not.toBeNull();
    const clearedValue = cookieHeader(clearedCookie); // "refreshToken="
    expect(clearedValue).toBe("refreshToken=");
  });

  it("makes the refresh token unusable after logout", async () => {
    await register();
    const loginRes = await login();
    const cookie = getRefreshCookie(loginRes);

    await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader(cookie));

    // Attempting to refresh with the pre-logout cookie must fail
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookie));

    expect(refreshRes.status).toBeGreaterThanOrEqual(401);
  });

  it("returns 200 gracefully even when no refresh cookie is sent", async () => {
    // Logout is idempotent — calling it without a cookie should not error.
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me  (protected route smoke test)
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/auth/me", () => {
  it("returns 200 with the authenticated user when a valid token is supplied", async () => {
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
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });

  it("returns 401 when the Bearer token is malformed", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.real.token");

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Complete auth flow: register → login → /me → refresh → /me → logout
// ═════════════════════════════════════════════════════════════════════════════

describe("Complete auth flow", () => {
  it("traverses the full lifecycle without errors", async () => {
    // 1. Register
    const registerRes = await register();
    expect(registerRes.status).toBe(201);
    const accessTokenV1 = registerRes.body.accessToken;
    const cookieV1 = getRefreshCookie(registerRes);

    // 2. Access protected route with the registration token
    const meRes1 = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessTokenV1}`);
    expect(meRes1.status).toBe(200);
    expect(meRes1.body.user.email).toBe(BASE_USER.email);

    // 3. Login (simulates a new session)
    const loginRes = await login();
    expect(loginRes.status).toBe(200);
    const accessTokenV2 = loginRes.body.accessToken;
    const cookieV2 = getRefreshCookie(loginRes);

    // 4. Refresh — produces token V3 and rotates the cookie
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieV2));
    expect(refreshRes.status).toBe(200);
    const accessTokenV3 = refreshRes.body.accessToken;
    const cookieV3 = getRefreshCookie(refreshRes);
    expect(accessTokenV3).not.toBe(accessTokenV2);

    // 5. Access /me with the refreshed token
    const meRes2 = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessTokenV3}`);
    expect(meRes2.status).toBe(200);

    // 6. Logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader(cookieV3));
    expect(logoutRes.status).toBe(200);

    // 7. Post-logout refresh must fail
    const postLogoutRefresh = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieV3));
    expect(postLogoutRefresh.status).toBeGreaterThanOrEqual(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Refresh token rotation (security)
// ═════════════════════════════════════════════════════════════════════════════

describe("Refresh token rotation", () => {
  it("invalidates the previous refresh token after each rotation", async () => {
    await register();
    const loginRes = await login();
    const cookieA = getRefreshCookie(loginRes); // token A

    // First rotation: token A → token B
    const refreshRes1 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieA));
    expect(refreshRes1.status).toBe(200);
    const cookieB = getRefreshCookie(refreshRes1); // token B

    // Second rotation: token B → token C
    const refreshRes2 = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieB));
    expect(refreshRes2.status).toBe(200);

    // Replaying the original token A must now be rejected
    const replayA = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieA));
    expect(replayA.status).toBe(403);

    // Replaying the intermediate token B must also be rejected
    const replayB = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieB));
    expect(replayB.status).toBe(403);
  });

  it("stores only the latest refresh token in the database after rotation", async () => {
    await register();
    const loginRes = await login();
    const cookieA = getRefreshCookie(loginRes);
    const tokenA = cookieHeader(cookieA).replace("refreshToken=", "");

    // Rotate once
    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader(cookieA));
    expect(refreshRes.status).toBe(200);
    const cookieB = getRefreshCookie(refreshRes);
    const tokenB = cookieHeader(cookieB).replace("refreshToken=", "");

    // Verify the DB record holds token B and not token A
    const user = await User.findOne({ email: BASE_USER.email }).select(
      "+refreshToken",
    );
    expect(user.refreshToken).toBe(tokenB);
    expect(user.refreshToken).not.toBe(tokenA);
  });
});
