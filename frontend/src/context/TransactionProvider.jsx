import { useEffect, useState } from "react";
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
    typeof tx.category === "string"
      ? tx.category
      : tx.category?.name || "Unknown",
});

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FETCH =================
  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const data = await getTransactions();
      const raw = data.transactions || data;

      const normalized = raw.map(normalizeTransaction);

      setTransactions(normalized);
    } catch (err) {
      console.error("FETCH ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= ADD =================
  const addTransaction = async (tx) => {
    try {
      const res = await createTransaction(tx);
      const newTx = res.transaction || res;

      const normalized = normalizeTransaction(newTx);

      setTransactions((prev) => [normalized, ...prev]);

      return normalized;
    } catch (err) {
      console.error("ADD ERROR:", err);
    }
  };

  // ================= DELETE =================
  const removeTransaction = async (id) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  // ================= UPDATE =================
  const editTransaction = async (id, updatedData) => {
    try {
      const res = await updateTransaction(id, updatedData);
      const updated = res.transaction || res;

      const normalized = normalizeTransaction(updated);

      setTransactions((prev) =>
        prev.map((t) => (t._id === id ? normalized : t)),
      );
    } catch (err) {
      console.error("UPDATE ERROR:", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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
