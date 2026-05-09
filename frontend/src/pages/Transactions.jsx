import React from "react";
import { useTransactions } from "../hooks/useTransaction";
import TransactionTable from "../components/TransactionTable";
import TransactionFilters from "../components/TransactionFilters";
import Pagination from "../components/Pagination";

const Transactions = () => {
  const { transactions, loading, error, removeTransaction } = useTransactions();

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-6">Transactions</h1>

      {/* ── Filters ── */}
      <TransactionFilters />

      {/* ── States ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-secondaryText gap-2">
          <p className="text-lg">No transactions found.</p>
          <p className="text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <TransactionTable
            transactions={transactions}
            onDelete={removeTransaction}
          />
          <Pagination />
        </>
      )}
    </div>
  );
};

export default Transactions;
