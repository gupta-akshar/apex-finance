import { useEffect, useState, useCallback, useRef } from "react";
import { TransactionContext } from "./TransactionContext";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../api/transactionApi";
import { DEFAULT_FILTERS } from "../constants/transactionFilters";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeTransaction = (tx) => ({
  ...tx,
  categoryName:
    typeof tx.category === "object" && tx.category !== null
      ? tx.category.name
      : tx.category || "Unknown",
  categoryId:
    typeof tx.category === "object" && tx.category !== null
      ? tx.category._id
      : tx.category,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  });

  const [filters, setFiltersState] = useState(DEFAULT_FILTERS);

  const abortRef = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const data = await getTransactions(filters, {
        signal: controller.signal,
      });

      // If this request was superseded (aborted), do not update state.
      if (controller.signal.aborted) return;

      const raw = data.transactions || [];
      setTransactions(raw.map(normalizeTransaction));
      setPagination(
        data.pagination ?? { total: 0, page: 1, pages: 1, limit: 10 },
      );
    } catch (err) {
      if (
        err?.name === "AbortError" ||
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED"
      ) {
        return;
      }
      console.error("FETCH ERROR:", err);
      setError(err?.response?.data?.message || "Failed to load transactions.");
    } finally {
      // Only clear loading if THIS request is still the active one.
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [filters]);

  // Abort on unmount to prevent state updates on an unmounted component.
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Auto-refetch when filters change.
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── setFilters ─────────────────────────────────────────────────────────────
  const setFilters = useCallback((updater) => {
    setFiltersState((prev) => {
      const next =
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater };

      const changedKeys = Object.keys(next).filter((k) => next[k] !== prev[k]);
      const onlyPageChanged =
        changedKeys.length === 1 && changedKeys[0] === "page";

      return onlyPageChanged ? next : { ...next, page: 1 };
    });
  }, []);

  // ── Convenience page setter ────────────────────────────────────────────────
  const setPage = useCallback((page) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  // ── Reset all filters ──────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // ── ADD ───────────────────────────────────────────────────────────────────
  const addTransaction = useCallback(
    async (tx) => {
      try {
        const res = await createTransaction(tx);
        const newTx = res.transaction || res;
        await fetchTransactions();
        return {
          transaction: normalizeTransaction(newTx),
          budgetWarning: res.budgetWarning ?? false,
          warningMessage: res.warningMessage ?? "",
        };
      } catch (err) {
        console.error("ADD ERROR:", err);
        throw err;
      }
    },
    [fetchTransactions],
  );

  // ── DELETE ────────────────────────────────────────────────────────────────
  const removeTransaction = useCallback(
    async (id) => {
      try {
        await deleteTransaction(id);
        // Optimistic UI: remove from local state immediately for responsiveness
        setTransactions((prev) => prev.filter((t) => t._id !== id));
        // Then refetch to get accurate pagination totals
        await fetchTransactions();
      } catch (err) {
        console.error("DELETE ERROR:", err);
        throw err;
      }
    },
    [fetchTransactions],
  );

  const editTransaction = useCallback(
    async (id, updatedData) => {
      try {
        const res = await updateTransaction(id, updatedData);
        const updated = res.transaction || res;
        const normalized = normalizeTransaction(updated);

        // Optimistic update: immediately reflect the change in the visible list
        setTransactions((prev) =>
          prev.map((t) => (t._id === id ? normalized : t)),
        );

        // Refetch to re-sort, re-paginate, and sync filter counts.
        await fetchTransactions();

        return normalized;
      } catch (err) {
        console.error("UPDATE ERROR:", err);
        throw err;
      }
    },
    [fetchTransactions],
  );

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
        error,
        pagination,
        filters,
        setFilters,
        setPage,
        resetFilters,
        addTransaction,
        removeTransaction,
        editTransaction,
        fetchTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
