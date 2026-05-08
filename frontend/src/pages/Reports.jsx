import React from "react";
import { useTransactions } from "../hooks/useTransaction";
import SummaryCard from "../components/SummaryCard";
import { ExpensePieChart, IncomeExpenseBarChart } from "../components/chart";

const Reports = () => {
  const { transactions } = useTransactions();

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryMap = {};
  transactions.forEach((t) => {
    if (t.type === "expense")
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = transactions.filter((t) => new Date(t.date).getMonth() === i);
    return {
      month: `M${i + 1}`,
      income: month
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
      expense: month
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    };
  });

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Reports</h1>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <SummaryCard
          title="Total Income"
          value={totalIncome}
          color="text-green-400"
        />
        <SummaryCard
          title="Total Expense"
          value={totalExpense}
          color="text-red-400"
        />
        <SummaryCard title="Balance" value={balance} color="text-white" />
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <ExpensePieChart data={categoryData} />
        <IncomeExpenseBarChart data={monthlyData} />
      </div>
    </div>
  );
};

export default Reports;
