import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "../hooks/useTransaction";
import TransactionModal from "../components/TransactionModal";

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
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-secondaryText text-sm">Total Balance</p>
          <h2 className="text-2xl font-semibold text-white">₹{balance}</h2>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-secondaryText text-sm">Total Income</p>
          <h2 className="text-2xl font-semibold text-green-400">
            ₹{totalIncome}
          </h2>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-secondaryText text-sm">Total Expenses</p>
          <h2 className="text-2xl font-semibold text-red-400">
            ₹{totalExpense}
          </h2>
        </div>
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
          <div className="space-y-4">
            {recentTx.map((tx) => (
              <div
                key={tx._id}
                className="flex justify-between items-center p-4 rounded-lg border border-border bg-inputBg"
              >
                <div>
                  <p className="font-medium">
                    {tx.category?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-secondaryText">
                    {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>

                <p
                  className={`font-semibold ${
                    tx.type === "expense" ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {tx.type === "expense" ? "-" : "+"}₹{tx.amount}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isOpen && <TransactionModal mode={mode} onClose={closeModal} />}
    </div>
  );
};

export default Dashboard;
