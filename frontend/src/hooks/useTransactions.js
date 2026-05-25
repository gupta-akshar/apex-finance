import { useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";

export const useTransactions = () => {
  const context = useContext(TransactionContext);

  if (!context) {
    throw new Error(
      "useTransactions must be used inside <TransactionProvider>",
    );
  }

  return context;
};
