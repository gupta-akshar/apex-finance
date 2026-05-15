import API from "./axios";

/**
 * recurringApi.js
 *
 * Matches backend routes in:  src/routes/recurring.routes.js
 * Controller:                 src/controllers/recurring.controller.js
 * All routes are protected (JWT via auth.middleware).
 */

// ─── GET all recurring transactions for the logged-in user ────────────────────
export const getRecurringTransactions = async () => {
  const res = await API.get("/recurring");
  return res.data;
};

// ─── CREATE a new recurring transaction ───────────────────────────────────────
export const addRecurringTransaction = async (data) => {
  const res = await API.post("/recurring", data);
  return res.data;
};

// ─── UPDATE a recurring transaction by id ─────────────────────────────────────
export const updateRecurringTransaction = async (id, data) => {
  const res = await API.put(`/recurring/${id}`, data);
  return res.data;
};

// ─── DELETE a recurring transaction by id ─────────────────────────────────────
export const deleteRecurringTransaction = async (id) => {
  const res = await API.delete(`/recurring/${id}`);
  return res.data;
};

// ─── TOGGLE active/paused status ──────────────────────────────────────────────
// Uses the existing PUT /recurring/:id endpoint — no separate toggle route needed.
export const toggleRecurringTransaction = async (id, currentActive) => {
  const res = await API.put(`/recurring/${id}`, { active: !currentActive });
  return res.data;
};
