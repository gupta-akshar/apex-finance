import { useEffect, useState, useCallback } from "react";
import { TransactionContext } from "./TransactionContext";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../api/transactionApi";

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

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FETCH =================
  // useCallback prevents a new function reference on every render,
  // which would cause infinite loops in any child useEffect that
  // lists fetchTransactions as a dependency
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      const raw = data.transactions || data;
      const normalized = raw.map(normalizeTransaction);
      setTransactions(normalized);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      // ❌ Do NOT re-throw here — this is called inside useEffect on mount.
      // An unhandled thrown error here can cause remount loops.
    } finally {
      setLoading(false);
    }
  }, []); // empty deps — this function never needs to change

  // ================= ADD =================
  const addTransaction = useCallback(async (tx) => {
    try {
      const res = await createTransaction(tx);
      const newTx = res.transaction || res;
      const normalized = normalizeTransaction(newTx);
      setTransactions((prev) => [normalized, ...prev]);
      return normalized;
    } catch (err) {
      console.error("ADD ERROR:", err);
      throw err; // safe to re-throw — caller (modal) handles it
    }
  }, []);

  // ================= DELETE =================
  const removeTransaction = useCallback(async (id) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error("DELETE ERROR:", err);
      throw err;
    }
  }, []);

  // ================= UPDATE =================
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

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]); // stable reference now — runs exactly once

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
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
