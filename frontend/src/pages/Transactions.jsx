import React from "react";
import { useTransactions } from "../context/TransactionContext";

const Transactions = () => {
  const { transactions, loading, removeTransaction } = useTransactions();

  if (loading) return <p className="p-6 text-secondaryText">Loading...</p>;
  if (transactions.length === 0)
    return <p className="p-6 text-secondaryText">No transactions yet.</p>;

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Transactions</h1>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <table className="w-full">
          <thead className="border-b border-border bg-inputBg">
            <tr className="text-left text-secondaryText text-sm">
              <th className="p-4">Category</th>
              <th className="p-4">Type</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Date</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx._id}
                className="border-b border-border hover:bg-[#1f1f23] transition-colors cursor-pointer"
              >
                <td className="p-4 font-medium">{tx.category}</td>
                <td className="p-4 capitalize text-secondaryText">{tx.type}</td>
                <td
                  className={`p-4 font-semibold ${tx.type === "expense" ? "text-red-400" : "text-green-400"}`}
                >
                  {tx.type === "expense" ? "-" : "+"}₹{tx.amount}
                </td>
                <td className="p-4 text-secondaryText">
                  {formatDate(tx.date)}
                </td>
                <td className="p-4">
                  <button
                    onClick={() =>
                      window.confirm("Delete this transaction?") &&
                      removeTransaction(tx._id)
                    }
                    className="text-red-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;
