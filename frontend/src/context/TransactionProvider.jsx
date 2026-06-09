import { useEffect, useState, useCallback } from "react";
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

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getTransactions(filters);

      const raw = data.transactions || [];
      setTransactions(raw.map(normalizeTransaction));
      setPagination(
        data.pagination ?? { total: 0, page: 1, pages: 1, limit: 10 },
      );
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setError(err?.response?.data?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Auto-refetch when filters change ─────────────────────────────────────
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── setFilters ───────────────────────────────────────────────────────────
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

  // ── Convenience: change page without resetting other filters ─────────────
  const setPage = useCallback((page) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  // ── Reset all filters ─────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // ── ADD ──────────────────────────────────────────────────────────────────

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

        setTransactions((prev) => prev.filter((t) => t._id !== id));

        await fetchTransactions();
      } catch (err) {
        console.error("DELETE ERROR:", err);
        throw err;
      }
    },
    [fetchTransactions],
  );

  // ── EDIT ──────────────────────────────────────────────────────────────────

  const editTransaction = useCallback(async (id, updatedData) => {
    try {
      const res = await updateTransaction(id, updatedData);
      const updated = res.transaction || res;
      const normalized = normalizeTransaction(updated);
      setTransactions((prev) =>
        prev.map((t) => (t._id === id ? normalized : t)),
      );
      return normalized;
    } catch (err) {
      console.error("UPDATE ERROR:", err);
      throw err;
    }
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        // data
        transactions,
        loading,
        error,
        pagination,
        // filter state
        filters,
        setFilters,
        setPage,
        resetFilters,
        // CRUD
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
