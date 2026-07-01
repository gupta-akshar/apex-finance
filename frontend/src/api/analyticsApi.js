import API from "./axios";

// ─── Overview ─────────────────────────────────────────────────────────────────

export const fetchOverview = async ({ signal } = {}) => {
  const res = await API.get("/analytics/overview", { signal });
  return res.data;
};

// ─── Monthly Summary ──────────────────────────────────────────────────────────

export const fetchMonthlySummary = async (month, year, { signal } = {}) => {
  const res = await API.get("/analytics/monthly", {
    params: { month, year },
    signal,
  });
  return res.data;
};

// ─── Category Breakdown ───────────────────────────────────────────────────────

export const fetchCategoryBreakdown = async (
  type,
  month = null,
  year = null,
  { signal } = {},
) => {
  const params = { type };
  if (year) params.year = year;
  if (month) params.month = month;

  const res = await API.get("/analytics/categories", { params, signal });
  return res.data;
};

export const fetchMonthlyTrend = async (year, { signal } = {}) => {
  const res = await API.get("/analytics/trend", { params: { year }, signal });
  return res.data;
};
