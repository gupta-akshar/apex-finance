import { useEffect, useState } from "react";
import { TransactionContext } from "./TransactionContext";

import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../api/transactionApi";

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FETCH =================
  const fetchTransactions = async () => {
    try {
      const data = await getTransactions();

      const tx = data.transactions || data;
      setTransactions(tx);
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

      setTransactions((prev) => [newTx, ...prev]);

      return newTx;
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

      setTransactions((prev) => prev.map((t) => (t._id === id ? updated : t)));
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
