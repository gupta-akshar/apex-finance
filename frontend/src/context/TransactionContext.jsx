import { createContext, useContext, useEffect, useState } from "react";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
} from "../api/transactionApi";

const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const data = await getTransactions();

      console.log("FETCHED TRANSACTIONS:", data); // 👈 ADD THIS

      setTransactions(data.transactions);
    } catch (err) {
      console.error("FETCH ERROR:", err); // 👈 ALSO THIS
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (tx) => {
    try {
      const res = await createTransaction(tx);

      console.log("NEW TX:", res); // keep this for debugging

      if (res?.transaction) {
        setTransactions((prev) => [...prev, res.transaction]);
      }
    } catch (err) {
      console.error("ADD TX ERROR:", err);
    }
  };

  const removeTransaction = async (id) => {
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t._id !== id));
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
        fetchTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => useContext(TransactionContext);
