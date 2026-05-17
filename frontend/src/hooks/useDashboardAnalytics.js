/**
 * useDashboardAnalytics.js
 *
 * Fetches all data the Dashboard needs for its stats cards and charts from the
 * backend analytics API endpoints.  Nothing here touches the paginated
 * TransactionContext — that context only drives the Transactions page list.
 *
 * Endpoints used:
 *   GET /api/analytics/overview         → all-time totals + count
 *   GET /api/analytics/trend?year=Y     → 12-month income/expense buckets
 *   GET /api/analytics/categories?type=expense&year=Y  → pie chart data
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchOverview,
  fetchMonthlyTrend,
  fetchCategoryBreakdown,
} from "../api/analyticsApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

/**
 * Turn the flat server trend array into 12 ordered buckets for the bar chart.
 *
 * Server shape:  [{ month: 1, type: "income", total: 5000 }, ...]
 * Output shape:  [{ month: "J", income: 0, expense: 0 }, ...] × 12
 */
const buildMonthlyBuckets = (rawTrend = []) => {
  const buckets = MONTH_LABELS.map((label) => ({
    month: label,
    income: 0,
    expense: 0,
  }));

  rawTrend.forEach(({ month, type, total }) => {
    const idx = month - 1; // server is 1-based
    if (idx < 0 || idx > 11) return;
    if (type === "income") buckets[idx].income = total;
    if (type === "expense") buckets[idx].expense = total;
  });

  return buckets;
};

/**
 * Turn the category breakdown array into the shape recharts PieChart expects.
 *
 * Server shape:  [{ category: "Food", total: 3200 }, ...]
 * Output shape:  [{ name: "Food", value: 3200 }, ...]
 */
const toPieData = (categories = []) =>
  categories.map(({ category, total }) => ({ name: category, value: total }));

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   stats:       { totalIncome, totalExpense, balance, transactionsCount }
 *   monthlyData: { month, income, expense }[]   — 12 items
 *   categoryData: { name, value }[]             — expense pie data
 *   loading:     boolean
 *   error:       string | null
 *   refresh:     () => void
 * }}
 */
const useDashboardAnalytics = () => {
  const currentYear = new Date().getFullYear();

  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactionsCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState(() =>
    MONTH_LABELS.map((m) => ({ month: m, income: 0, expense: 0 })),
  );
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Abort controller prevents stale responses from overwriting newer ones
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    // Cancel any previous in-flight fetch cycle
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // Fire all three requests in parallel — no sequential waterfall
      const [overview, trendRaw, expenseCats] = await Promise.all([
        fetchOverview(),
        fetchMonthlyTrend(currentYear),
        fetchCategoryBreakdown("expense", null, currentYear),
      ]);

      // Bail if this request cycle was superseded
      if (controller.signal.aborted) return;

      // Overview → summary cards
      setStats({
        totalIncome: overview.totalIncome ?? 0,
        totalExpense: overview.totalExpense ?? 0,
        balance: overview.balance ?? 0,
        transactionsCount: overview.transactionsCount ?? 0,
      });

      // Trend → bar chart
      setMonthlyData(buildMonthlyBuckets(trendRaw));

      // Category breakdown → pie chart
      setCategoryData(toPieData(expenseCats));
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      console.error("useDashboardAnalytics error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard analytics.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  return {
    stats,
    monthlyData,
    categoryData,
    loading,
    error,
    refresh: load,
  };
};

export default useDashboardAnalytics;
