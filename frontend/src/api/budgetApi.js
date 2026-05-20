// frontend/src/api/budgetApi.js
import API from "./axios";

/**
 * Create or update a budget for a category/month/year combination.
 *
 * @param {{ category: string, limit: number, month: number, year: number }} data
 *   category — the Category ObjectId string (NOT the name)
 */
export const setBudget = async (data) => {
  const res = await API.post("/budgets", data);
  return res.data;
};

/**
 * Fetch budget progress for a given month/year.
 * Returns an array of budget status objects with spent, remaining, percentage.
 *
 * @param {number} month  1–12
 * @param {number} year   e.g. 2025
 */
export const getBudgetStatus = async (month, year) => {
  const res = await API.get("/budgets/status", { params: { month, year } });
  return res.data;
};

/**
 * Fetch all budgets for the current user (optionally filtered).
 *
 * @param {{ month?: number, year?: number }} params
 */
export const getBudgets = async (params = {}) => {
  const res = await API.get("/budgets", { params });
  return res.data;
};

/**
 * Delete a budget by its MongoDB _id.
 *
 * @param {string} id  Budget document _id
 */
export const deleteBudget = async (id) => {
  const res = await API.delete(`/budgets/${id}`);
  return res.data;
};
