import { useContext } from "react";
import { TransactionContext } from "../context/TransactionContext";

export const useTransactions = () => {
  return useContext(TransactionContext);
};
