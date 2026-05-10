import React, { useState } from "react";
import { useTransactions } from "../hooks/useTransaction";
import TransactionsToolbar from "../components/TransactionsToolbar";
import AdvancedFiltersPanel from "../components/AdvancedFiltersPanel";
import TransactionTable from "../components/TransactionTable";
import Pagination from "../components/Pagination";

const Transactions = () => {
  const { transactions, loading, error, removeTransaction } = useTransactions();

  // Controls the advanced filter panel — toggled by the toolbar button
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="min-h-screen bg-background text-primaryText flex flex-col">
      {/* ── Sticky Toolbar (search + type + sort + toggle) ── */}
      <TransactionsToolbar
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
      />

      {/* ── Advanced Filters (collapsible, values preserved on close) ── */}
      <AdvancedFiltersPanel isOpen={showAdvanced} />

      {/* ── Page body ── */}
      <div className="flex-1 px-6 py-5">
        {/* Page title */}
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-xl font-semibold text-primaryText">
            Transactions
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-7 h-7 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <span className="text-4xl opacity-30">🗒</span>
            <p className="text-primaryText font-medium">
              No transactions found
            </p>
            <p className="text-secondaryText text-sm">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          /* Table + pagination */
          <>
            <TransactionTable
              transactions={transactions}
              onDelete={removeTransaction}
            />
            <Pagination />
          </>
        )}
      </div>
    </div>
  );
};

export default Transactions;
