import React from "react";
import { useTransactions } from "../context/TransactionContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { transactions, loading } = useTransactions();
  const navigate = useNavigate();

  if (loading) return <p className="p-6 text-secondaryText">Loading...</p>;

  // Summary calculations
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Recent transactions (latest 3)
  const recentTx = [...transactions].reverse().slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          { title: "Total Balance", amount: balance, color: "text-white" },
          {
            title: "Total Income",
            amount: totalIncome,
            color: "text-green-400",
          },
          {
            title: "Total Expenses",
            amount: totalExpense,
            color: "text-red-400",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-6 hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <p className="text-secondaryText text-sm mb-2">{stat.title}</p>
            <h2 className={`text-2xl font-semibold ${stat.color}`}>
              ₹{stat.amount}
            </h2>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <button
            onClick={() => navigate("/add-transaction")}
            className="bg-accent hover:bg-accentHover text-white px-4 py-2 rounded-lg transition transform hover:scale-105"
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
                className={`flex justify-between items-center p-4 rounded-lg border border-border bg-inputBg hover:bg-[#1f1f23] transition-colors duration-300 cursor-pointer`}
              >
                <div>
                  <p className="font-medium">{tx.category}</p>
                  <p className="text-sm text-secondaryText">
                    {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`font-semibold ${tx.type === "expense" ? "text-red-400" : "text-green-400"}`}
                >
                  {tx.type === "expense" ? "-" : "+"}₹{tx.amount}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
