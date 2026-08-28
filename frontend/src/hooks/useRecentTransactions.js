import { useState, useEffect, useRef, useCallback } from "react";
import { getTransactions } from "../api/transactionApi";

const normalizeTransaction = (tx) => ({
  ...tx,
  categoryName:
    typeof tx.category === "object" && tx.category !== null
      ? tx.category.name
      : (tx.category ?? "Unknown"),
  categoryId:
    typeof tx.category === "object" && tx.category !== null
      ? tx.category._id
      : tx.category,
});

const useRecentTransactions = (limit = 5) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const limitRef = useRef(limit);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  const abortRef = useRef(null);

  // ── Single shared fetch implementation ────────────────────────────────────
  const doFetch = useCallback(async (signal) => {
    try {
      const data = await getTransactions(
        { limit: limitRef.current, sort: "latest", page: 1 },
        { signal },
      );
      return (data.transactions ?? []).map(normalizeTransaction);
    } catch (err) {
      if (err?.name === "AbortError" || err?.name === "CanceledError")
        return null;
      console.error("useRecentTransactions error:", err);
      return [];
    }
  }, []);

  // ── Manual refresh (stable reference) ────────────────────────────────────
  const refresh = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const result = await doFetch(controller.signal);
    if (result !== null) setTransactions(result);
    if (!controller.signal.aborted) setLoading(false);
  }, [doFetch]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    queueMicrotask(() => {
      setLoading(true);
      doFetch(controller.signal).then((result) => {
        if (result === null) return;
        if (!controller.signal.aborted) {
          setTransactions(result);
          setLoading(false);
        }
      });
    });

    return () => controller.abort();
  }, [limit, doFetch]);

  return { transactions, loading, refresh };
};

export default useRecentTransactions;
