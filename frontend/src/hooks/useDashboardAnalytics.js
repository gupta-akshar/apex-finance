import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchOverview,
  fetchMonthlyTrend,
  fetchCategoryBreakdown,
} from "../api/analyticsApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const toPieData = (categories = []) =>
  categories.map(({ category, total }) => ({ name: category, value: total }));

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(null);

    try {
      const [overview, trendRaw, expenseCats] = await Promise.all([
        fetchOverview({ signal }),
        fetchMonthlyTrend(currentYear, { signal }),
        fetchCategoryBreakdown("expense", null, currentYear, { signal }),
      ]);

      if (controller.signal.aborted) return;

      setStats({
        totalIncome: overview.totalIncome ?? 0,
        totalExpense: overview.totalExpense ?? 0,
        balance: overview.balance ?? 0,
        transactionsCount: overview.transactionsCount ?? 0,
      });

      setMonthlyData(buildMonthlyBuckets(trendRaw));

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
