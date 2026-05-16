import API from "./axios";

/**
 * analyticsApi.js
 *
 * All four analytics endpoints are GET routes.  Parameters live in the query
 * string, not the request body.
 *
 * Matching backend routes (analytics.routes.js):
 *   GET /api/analytics/overview
 *   GET /api/analytics/monthly?month=M&year=Y
 *   GET /api/analytics/categories?type=income|expense[&month=M][&year=Y]
 *   GET /api/analytics/trend?year=Y
 */

// ─── Overview ─────────────────────────────────────────────────────────────────
// All-time totals: totalIncome, totalExpense, balance, transactionsCount.
// No params required.

export const fetchOverview = async () => {
  const res = await API.get("/analytics/overview");
  return res.data;
};

// ─── Monthly Summary ──────────────────────────────────────────────────────────
// Totals for a single calendar month.
// @param {number} month  1–12
// @param {number} year   e.g. 2025
// Returns: { income, expense, balance }

export const fetchMonthlySummary = async (month, year) => {
  const res = await API.get("/analytics/monthly", {
    params: { month, year },
  });
  return res.data;
};

// ─── Category Breakdown ───────────────────────────────────────────────────────
// Totals grouped by category name.
// @param {"income"|"expense"} type
// @param {number|null}        month  optional — omit for full-year
// @param {number}             year   optional but strongly recommended
// Returns: [{ category: string, total: number }, ...]

export const fetchCategoryBreakdown = async (
  type,
  month = null,
  year = null,
) => {
  const params = { type };
  if (year) params.year = year;
  if (month) params.month = month;

  const res = await API.get("/analytics/categories", { params });
  return res.data;
};

// ─── Monthly Trend ────────────────────────────────────────────────────────────
// Per-month income AND expense for every month in the given year.
// @param {number} year  e.g. 2025
// Returns raw server data:
//   [{ month: 1, type: "income", total: 5000 }, { month: 1, type: "expense", total: 2000 }, ...]
//
// The hook (useAnalytics) transforms this into a 12-bucket array:
//   [{ month: "Jan", income: 5000, expense: 2000, net: 3000 }, ...]

export const fetchMonthlyTrend = async (year) => {
  const res = await API.get("/analytics/trend", { params: { year } });
  return res.data;
};
