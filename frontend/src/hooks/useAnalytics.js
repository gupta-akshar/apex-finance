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
const buildMonthlyBuckets = (rawTrend) => {
  const buckets = MONTH_LABELS.map((label) => ({
    month: label,
    income: 0,
    expense: 0,
    net: 0,
  }));

  rawTrend.forEach(({ month, type, total }) => {
    const idx = month - 1; // server is 1-based; array is 0-based
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
const useAnalytics = (year, monthIdx) => {
  const [monthlyBuckets, setMonthlyBuckets] = useState(() =>
    MONTH_LABELS.map((m) => ({ month: m, income: 0, expense: 0, net: 0 })),
  );
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [peakMonth, setPeakMonth] = useState({ month: "", net: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const numericYear = Number(year);

    const hasMonth =
      monthIdx !== "" && monthIdx !== null && monthIdx !== undefined;
    const backendMonth = hasMonth ? Number(monthIdx) + 1 : null;

    try {
      const trendPromise = fetchMonthlyTrend(numericYear);

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
  }, [year, monthIdx]);

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
