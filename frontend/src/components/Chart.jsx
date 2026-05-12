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

/* ─── Palette ────────────────────────────────────────────────────────────── */
const COLORS = [
  "#6366f1",
  "#4ade80",
  "#f87171",
  "#facc15",
  "#a78bfa",
  "#fb923c",
  "#38bdf8",
  "#f472b6",
];

/* ─── Custom tooltip ─────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-[#3f3f46] px-3 py-2 text-xs"
      style={{
        background: "#18181b",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {label && (
        <p className="text-[#a1a1aa] mb-1.5 font-sans text-[11px]">{label}</p>
      )}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? "#e4e4e7" }}>
          {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

/* ─── Shared card wrapper ────────────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, children, minH = 280 }) => (
  <div
    className="rounded-xl border border-[#27272a] overflow-hidden"
    style={{ background: "linear-gradient(145deg, #18181b 0%, #141416 100%)" }}
  >
    {/* Header */}
    <div className="px-5 pt-5 pb-0 flex items-start justify-between">
      <div>
        <p
          className="text-sm font-semibold text-[#e4e4e7]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-[11px] text-[#52525b] mt-0.5"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>

    {/* Chart area */}
    <div className="px-2 pt-4 pb-4" style={{ minHeight: minH }}>
      {children}
    </div>
  </div>
);

/* ─── Pie chart ──────────────────────────────────────────────────────────── */
export const ExpensePieChart = ({ data }) => {
  if (!data?.length) {
    return (
      <ChartCard title="Expenses by Category" subtitle="Category breakdown">
        <div className="flex items-center justify-center h-48 text-[#52525b] text-sm">
          No expense data yet
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Expenses by Category" subtitle="All time" minH={300}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                opacity={0.9}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{
              fontSize: "11px",
              color: "#71717a",
              fontFamily: "'Sora', sans-serif",
              paddingTop: "8px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/* ─── Bar chart ──────────────────────────────────────────────────────────── */
export const IncomeExpenseBarChart = ({ data }) => {
  const hasData = data?.some((d) => d.income > 0 || d.expense > 0);

  if (!hasData) {
    return (
      <ChartCard title="Income vs Expense" subtitle="Monthly comparison">
        <div className="flex items-center justify-center h-48 text-[#52525b] text-sm">
          No transaction data yet
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Income vs Expense"
      subtitle="Monthly breakdown"
      minH={300}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="30%" barGap={2}>
          <CartesianGrid
            strokeDasharray="1 4"
            stroke="#27272a"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{
              fill: "#52525b",
              fontSize: 10,
              fontFamily: "'Sora', sans-serif",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{
              fill: "#52525b",
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{
              fontSize: "11px",
              color: "#71717a",
              fontFamily: "'Sora', sans-serif",
            }}
          />
          <Bar
            dataKey="income"
            name="Income"
            fill="#4ade80"
            radius={[3, 3, 0, 0]}
            opacity={0.85}
          />
          <Bar
            dataKey="expense"
            name="Expense"
            fill="#f87171"
            radius={[3, 3, 0, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
