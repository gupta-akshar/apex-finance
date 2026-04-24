import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { useTransactions } from "../hooks/useTransaction";

const Reports = () => {
  const { transactions } = useTransactions();

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Category summary
  const categoryMap = {};
  transactions.forEach((t) => {
    if (t.type === "expense") {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    }
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Monthly summary (simple example)
  const monthlyData = [];
  for (let i = 1; i <= 12; i++) {
    const monthTransactions = transactions.filter(
      (t) => new Date(t.date).getMonth() + 1 === i,
    );
    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    monthlyData.push({ month: `M${i}`, income, expense });
  }

  const COLORS = [
    "#6366f1",
    "#22c55e",
    "#ef4444",
    "#f59e0b",
    "#8b5cf6",
    "#f43f5e",
  ];

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Reports</h1>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          {
            title: "Total Income",
            value: totalIncome,
            color: "text-green-400",
          },
          {
            title: "Total Expense",
            value: totalExpense,
            color: "text-red-400",
          },
          { title: "Balance", value: balance, color: "text-white" },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 hover:scale-105 cursor-pointer"
          >
            <p className="text-secondaryText mb-2">{s.title}</p>
            <h2 className={`text-2xl font-semibold ${s.color}`}>₹{s.value}</h2>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-xl font-semibold mb-6">Expense by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-xl font-semibold mb-6">Income vs Expense</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" />
              <Bar dataKey="expense" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
