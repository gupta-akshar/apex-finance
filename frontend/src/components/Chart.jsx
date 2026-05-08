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

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
];

export const ExpensePieChart = ({ data }) => (
  <div className="bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
    <h2 className="text-xl font-semibold mb-6">Expense by Category</h2>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={120} label>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export const IncomeExpenseBarChart = ({ data }) => (
  <div className="bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
    <h2 className="text-xl font-semibold mb-6">Income vs Expense</h2>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
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
);
