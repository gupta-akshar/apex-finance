import API from "./axios";

/**
 * recurringApi.js
 *
 * Matches backend routes in:  src/routes/recurring.routes.js
 * Controller:                 src/controllers/recurring.controller.js
 * All routes are protected (JWT via auth.middleware).
 *
 * Field naming convention (canonical):
 *   isActive — the ONLY boolean field for pause/resume state.
 *   Do NOT send "active"; the backend accepts it for legacy compat but the
 *   frontend should always send "isActive" going forward.
 */

// ─── GET all recurring transactions for the logged-in user ────────────────────
export const getRecurringTransactions = async () => {
  const res = await API.get("/recurring");
  return res.data;
};

// ─── CREATE a new recurring transaction ───────────────────────────────────────
export const addRecurringTransaction = async (data) => {
  const res = await API.post("/recurring", sanitizePayload(data));
  return res.data;
};

// ─── UPDATE (full edit) a recurring transaction by id ─────────────────────────
export const updateRecurringTransaction = async (id, data) => {
  const res = await API.put(`/recurring/${id}`, sanitizePayload(data));
  return res.data;
};

// ─── TOGGLE active/paused status ──────────────────────────────────────────────
// Sends ONLY the isActive field so the payload is minimal and unambiguous.
// The controller's pickFields() handles this partial update correctly.
export const toggleRecurringTransaction = async (id, nextIsActive) => {
  const res = await API.put(`/recurring/${id}`, { isActive: nextIsActive });
  return res.data;
};

// ─── DELETE a recurring transaction by id ─────────────────────────────────────
export const deleteRecurringTransaction = async (id) => {
  const res = await API.delete(`/recurring/${id}`);
  return res.data;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Strip any accidental "active" key and ensure "isActive" is used.
 * Also removes undefined values so the backend only sees what the frontend
 * explicitly set.
 */
const sanitizePayload = (data) => {
  const out = {};

  const allowed = [
    "title",
    "type",
    "amount",
    "category",
    "frequency",
    "startDate",
    "endDate",
    "note",
    "isActive",
  ];

  allowed.forEach((key) => {
    if (data[key] !== undefined) out[key] = data[key];
  });

  // Translate accidental "active" → "isActive" (backwards compat during deploy)
  if (data.active !== undefined && out.isActive === undefined) {
    out.isActive = data.active;
  }

  return out;
};
