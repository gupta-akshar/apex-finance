import React from "react";
import { useTransactions } from "../hooks/useTransaction";
import TransactionTable from "../components/TransactionTable";

const Transactions = () => {
  const { transactions, loading, removeTransaction } = useTransactions();

  if (loading) return <p className="p-6">Loading...</p>;

  if (transactions.length === 0)
    return <p className="p-6">No transactions yet.</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl mb-6">Transactions</h1>

      <TransactionTable
        transactions={transactions}
        onDelete={removeTransaction}
      />
    </div>
  );
};

export default Transactions;
