import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchMonthlySummary,
  fetchCategoryBreakdown,
  fetchMonthlyTrend,
} from "../api/analyticsApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Transform the flat server trend array into an ordered 12-bucket structure
 * needed by the bar / area charts.
 *
 * Server returns:
 *   [{ month: 1, type: "income", total: 5000 }, { month: 1, type: "expense", total: 2000 }, ...]
 *
 * Output:
 *   [{ month: "Jan", income: 0, expense: 0, net: 0 }, ...] (always 12 items)
 */
const buildMonthlyBuckets = (rawTrend) => {
  const buckets = MONTH_LABELS.map((label) => ({
    month: label,
    income: 0,
    expense: 0,
    net: 0,
  }));

  rawTrend.forEach(({ month, type, total }) => {
    const idx = month - 1; // month is 1-based
    if (idx < 0 || idx > 11) return;
    if (type === "income") buckets[idx].income = total;
    if (type === "expense") buckets[idx].expense = total;
  });

  buckets.forEach((b) => {
    b.net = b.income - b.expense;
  });

  return buckets;
};

/**
 * Derive summary stats from the 12-bucket array (used for full-year view).
 */
const sumBuckets = (buckets) => {
  const income = buckets.reduce((s, b) => s + b.income, 0);
  const expense = buckets.reduce((s, b) => s + b.expense, 0);
  return { income, expense, balance: income - expense };
};

/**
 * Find the month with the highest net surplus.
 */
const findPeakMonth = (buckets) =>
  buckets.reduce(
    (best, b) => (b.net > best.net ? b : best),
    buckets[0] ?? { month: "", net: 0 },
  );

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAnalytics
 *
 * Fetches all data the Reports page needs from the backend analytics API.
 * Re-fetches automatically whenever `year` or `month` changes.
 *
 * @param {string}      year   "2025"
 * @param {string|null} month  "0"–"11" (JS month index) or "" for full-year
 *
 * @returns {{
 *   monthlyBuckets:     { month, income, expense, net }[]  12 items, always
 *   stats:              { income, expense, balance }        for selected period
 *   expenseCategories:  { category, total }[]
 *   incomeCategories:   { category, total }[]
 *   peakMonth:          { month, net }
 *   loading:            boolean
 *   error:              string | null
 * }}
 */
const useAnalytics = (year, month) => {
  const [monthlyBuckets, setMonthlyBuckets] = useState(() =>
    MONTH_LABELS.map((m) => ({ month: m, income: 0, expense: 0, net: 0 })),
  );
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [peakMonth, setPeakMonth] = useState({ month: "", net: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Abort controller ref — cancel in-flight requests when params change
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    // Cancel any previous in-flight fetch
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const numericYear = Number(year);
    // month is a JS index string ("0"–"11") or "" for full-year
    const hasMonth = month !== "" && month !== null && month !== undefined;
    // Backend expects 1-based month
    const backendMonth = hasMonth ? Number(month) + 1 : null;

    try {
      // ── Always fetch: 12-month trend (used for bar/area charts + full-year stats)
      const trendPromise = fetchMonthlyTrend(numericYear);

      // ── Always fetch: category breakdowns for selected period
      const expCatPromise = fetchCategoryBreakdown(
        "expense",
        backendMonth,
        numericYear,
      );
      const incCatPromise = fetchCategoryBreakdown(
        "income",
        backendMonth,
        numericYear,
      );

      // ── Conditionally fetch: monthly summary when a specific month is selected
      const monthlyPromise = hasMonth
        ? fetchMonthlySummary(backendMonth, numericYear)
        : Promise.resolve(null);

      const [trendRaw, expCat, incCat, monthlySummary] = await Promise.all([
        trendPromise,
        expCatPromise,
        incCatPromise,
        monthlyPromise,
      ]);

      // Check if this request was superseded
      if (controller.signal.aborted) return;

      // ── Transform trend into 12-bucket array
      const buckets = buildMonthlyBuckets(trendRaw);
      setMonthlyBuckets(buckets);
      setPeakMonth(findPeakMonth(buckets));

      // ── Stats: specific month or full-year sum
      if (hasMonth && monthlySummary) {
        setStats({
          income: monthlySummary.income ?? 0,
          expense: monthlySummary.expense ?? 0,
          balance: monthlySummary.balance ?? 0,
        });
      } else {
        setStats(sumBuckets(buckets));
      }

      setExpenseCategories(expCat ?? []);
      setIncomeCategories(incCat ?? []);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      console.error("useAnalytics fetch error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load analytics data.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  return {
    monthlyBuckets,
    stats,
    expenseCategories,
    incomeCategories,
    peakMonth,
    loading,
    error,
    refresh: load,
  };
};

export default useAnalytics;
