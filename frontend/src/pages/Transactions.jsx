import React from "react";
import { useTransactions } from "../hooks/useTransaction.js";
import TransactionTable from "../components/TransactionTable";

const Transactions = () => {
  const { transactions, loading, removeTransaction } = useTransactions();

  if (loading) return <p className="p-6 text-secondaryText">Loading...</p>;
  if (transactions.length === 0)
    return <p className="p-6 text-secondaryText">No transactions yet.</p>;

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Transactions</h1>
      <TransactionTable
        transactions={transactions}
        onDelete={removeTransaction}
      />
    </div>
  );
};

export default Transactions;
