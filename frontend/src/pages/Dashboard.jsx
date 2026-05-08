import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "../hooks/useTransaction";
import TransactionModal from "../components/TransactionModal";
import TransactionTable from "../components/TransactionTable";
import SummaryCard from "../components/SummaryCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { transactions, loading } = useTransactions();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(null);

  const openModal = (type) => {
    setMode(type);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setMode(null);
  };

  if (loading) return <p className="p-6 text-secondaryText">Loading...</p>;

  // Summary
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const recentTx = [...transactions].reverse().slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 justify-end mb-6">
        <button
          onClick={() => openModal("income")}
          className="bg-green-500 px-4 py-2 rounded-lg text-white"
        >
          New Income
        </button>

        <button
          onClick={() => openModal("expense")}
          className="bg-red-500 px-4 py-2 rounded-lg text-white"
        >
          New Expense
        </button>

        <button
          onClick={() => navigate("/recurring")}
          className="bg-blue-500 px-4 py-2 rounded-lg text-white"
        >
          New Recurring
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <SummaryCard title="Total Balance" value={balance} color="text-white" />
        <SummaryCard
          title="Total Income"
          value={totalIncome}
          color="text-green-400"
        />
        <SummaryCard
          title="Total Expenses"
          value={totalExpense}
          color="text-red-400"
        />
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>

          <button
            onClick={() => openModal("expense")}
            className="bg-accent px-4 py-2 rounded-lg text-white"
          >
            Add Transaction
          </button>
        </div>

        {recentTx.length === 0 ? (
          <p className="text-secondaryText">No recent transactions</p>
        ) : (
          <TransactionTable transactions={recentTx} />
        )}
      </div>

      {/* MODAL */}
      {isOpen && <TransactionModal mode={mode} onClose={closeModal} />}
    </div>
  );
};

export default Dashboard;
