import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import useAnalytics from "../hooks/useAnalytics";
import useFonts from "../hooks/useFonts";
import { PIE_COLORS, INCOME_PIE_COLORS } from "../constants/colors";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const inrFmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

const shortFmt = (v) =>
  v >= 1_00_000
    ? `₹${(v / 1_00_000).toFixed(1)}L`
    : v >= 1_000
      ? `₹${(v / 1_000).toFixed(0)}k`
      : `₹${v}`;

const pct = (num, den) =>
  den === 0 ? 0 : Math.max(0, Math.min(100, Math.round((num / den) * 100)));

/* ─── Custom tooltip ─────────────────────────────────────────────────────── */
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-[#3f3f46] px-3 py-2.5 text-xs"
      style={{
        background: "#18181b",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        fontFamily: "'Sora', sans-serif",
        minWidth: 130,
      }}
    >
      {label && <p className="text-[#71717a] mb-1.5 text-[11px]">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color ?? "#a1a1aa" }}>{p.name}</span>
          <span
            className="font-semibold"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: p.color ?? "#e4e4e7",
            }}
          >
            {inrFmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Section label ──────────────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <p
    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3"
    style={{ fontFamily: "'Sora', sans-serif" }}
  >
    {children}
  </p>
);

/* ─── ChartPanel ─────────────────────────────────────────────────────────── */
const ChartPanel = ({ title, subtitle, children, className = "" }) => (
  <div
    className={`rounded-xl border border-[#27272a] overflow-hidden ${className}`}
    style={{ background: "linear-gradient(145deg,#18181b 0%,#141416 100%)" }}
  >
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
    <div className="px-2 pt-4 pb-4">{children}</div>
  </div>
);

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({
  label,
  value,
  sub,
  borderColor,
  glowColor,
  textColor,
  icon,
  badge,
}) => (
  <div
    className="relative rounded-xl border border-[#27272a] overflow-hidden transition-all duration-200 hover:border-[#3f3f46] group"
    style={{ background: "linear-gradient(145deg,#18181b 0%,#141416 100%)" }}
  >
    <div
      className="absolute left-0 top-0 bottom-0 w-[3px]"
      style={{ background: borderColor }}
    />
    <div
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at top left,${glowColor} 0%,transparent 65%)`,
      }}
    />
    <div className="pl-5 pr-4 py-4 relative">
      <div className="flex items-start justify-between mb-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717a]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: badge.bg,
                color: badge.color,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {badge.text}
            </span>
          )}
          {icon && (
            <span className="text-base opacity-35 group-hover:opacity-60 transition-opacity">
              {icon}
            </span>
          )}
        </div>
      </div>
      <p
        className="text-2xl font-semibold tabular-nums leading-none"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: textColor }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-1.5 text-[11px] text-[#52525b]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {sub}
        </p>
      )}
    </div>
  </div>
);

/* ─── Empty chart placeholder ────────────────────────────────────────────── */
const EmptyChart = ({ msg = "No data for selected period" }) => (
  <div className="flex flex-col items-center justify-center h-48 gap-2">
    <span className="text-3xl opacity-20">◉</span>
    <p
      className="text-sm text-[#52525b]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {msg}
    </p>
  </div>
);

/* ─── Error banner ───────────────────────────────────────────────────────── */
const ErrorBanner = ({ message, onRetry }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border border-red-500/20 bg-red-500/8 mb-6">
    <p
      className="text-sm text-red-400"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs text-red-400 border border-red-500/30 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
      >
        Retry
      </button>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  REPORTS PAGE                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
const Reports = () => {
  useFonts();

  /* ── Toolbar state ── */
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const [monthIdx, setMonthIdx] = useState("");

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i)),
    [currentYear],
  );

  /* ── Analytics data — monthIdx is passed as-is; useAnalytics owns the +1 ── */
  const {
    monthlyBuckets,
    stats,
    expenseCategories,
    incomeCategories,
    peakMonth,
    loading,
    error,
    refresh,
  } = useAnalytics(year, monthIdx);

  /* ── Derived flags ── */
  const hasMonthly = monthlyBuckets.some((b) => b.income > 0 || b.expense > 0);
  const hasExpenses = expenseCategories.length > 0;
  const hasData = stats.income > 0 || stats.expense > 0;
  const isFullYear = monthIdx === "";

  /* ── Savings rate ── */
  const savingsRate = pct(stats.balance, stats.income);

  /* ── Selected month label for display ── */
  const periodLabel = isFullYear
    ? `Full year ${year}`
    : `${MONTH_LABELS[Number(monthIdx)]} ${year}`;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#52525b]">Building your report…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* ── Ambient orb ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle,#22c55e 0%,transparent 70%)",
            filter: "blur(64px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle,#6366f1 0%,transparent 70%)",
            filter: "blur(56px)",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STICKY TOOLBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-10 border-b border-[#27272a] bg-[#0a0a0c]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex flex-wrap items-center gap-3">
          {/* Page title chip */}
          <span className="text-xs font-semibold text-[#52525b] uppercase tracking-[0.14em] mr-1 hidden sm:inline">
            Reports
          </span>

          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setMonthIdx(""); // reset to full-year when year changes
            }}
            className={[
              "bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-1.5",
              "text-sm text-[#e4e4e7] focus:outline-none focus:ring-2",
              "focus:ring-[#6366f1]/40 focus:border-[#6366f1]/50 transition-all",
            ].join(" ")}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Month chips — clicking "Jan" sets monthIdx = "0" (JS 0-based) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMonthIdx("")}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all",
                monthIdx === ""
                  ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
                  : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]",
              ].join(" ")}
            >
              Full Year
            </button>
            {MONTH_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setMonthIdx(String(i))} // store 0-based index
                className={[
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all",
                  String(i) === monthIdx
                    ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
                    : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* ── Page Header ── */}
        <div>
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Financial Reports
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            {periodLabel} · data from all transactions
          </p>
        </div>

        {/* ── Error banner ── */}
        {error && <ErrorBanner message={error} onRetry={refresh} />}

        {/* ══════════════════════════════════════════════════════════════════
            ANALYTICS CARDS
        ══════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionLabel>Summary</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Net Balance"
              value={inrFmt(stats.balance)}
              icon="⚖"
              sub={
                stats.balance >= 0 ? "Positive cashflow" : "Negative cashflow"
              }
              borderColor="#6366f1"
              glowColor="rgba(99,102,241,0.12)"
              textColor={stats.balance >= 0 ? "#a5b4fc" : "#f87171"}
            />
            <StatCard
              label="Total Income"
              value={inrFmt(stats.income)}
              icon="↑"
              sub={periodLabel}
              borderColor="#4ade80"
              glowColor="rgba(74,222,128,0.10)"
              textColor="#4ade80"
            />
            <StatCard
              label="Total Expenses"
              value={inrFmt(stats.expense)}
              icon="↓"
              sub={periodLabel}
              borderColor="#f87171"
              glowColor="rgba(248,113,113,0.10)"
              textColor="#f87171"
            />
            <StatCard
              label="Savings Rate"
              value={`${savingsRate}%`}
              icon="◎"
              sub={`₹${Number(Math.max(0, stats.balance)).toLocaleString("en-IN")} saved`}
              borderColor="#facc15"
              glowColor="rgba(250,204,21,0.08)"
              textColor="#facc15"
              badge={
                savingsRate >= 20
                  ? {
                      text: "On track",
                      bg: "rgba(74,222,128,0.15)",
                      color: "#4ade80",
                    }
                  : savingsRate > 0
                    ? {
                        text: "Low",
                        bg: "rgba(250,204,21,0.15)",
                        color: "#facc15",
                      }
                    : {
                        text: "Deficit",
                        bg: "rgba(248,113,113,0.15)",
                        color: "#f87171",
                      }
              }
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CHARTS
        ══════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionLabel>Trends</SectionLabel>
          <div className="space-y-5">
            {/* ── Monthly Income vs Expense bar chart (always shows full year) ── */}
            <ChartPanel
              title="Monthly Income vs Expense"
              subtitle={`${year} — all 12 months`}
            >
              {hasMonthly ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={monthlyBuckets}
                    barCategoryGap="30%"
                    barGap={2}
                  >
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
                        fontFamily: "'Sora',sans-serif",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: "#52525b",
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={shortFmt}
                    />
                    <Tooltip
                      content={<DarkTooltip />}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{
                        fontSize: 11,
                        color: "#71717a",
                        fontFamily: "'Sora',sans-serif",
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
              ) : (
                <EmptyChart />
              )}
            </ChartPanel>

            {/* ── Net Cashflow area chart ── */}
            <ChartPanel
              title="Net Cashflow"
              subtitle={`Monthly surplus / deficit · ${year}`}
            >
              {hasMonthly ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={monthlyBuckets}>
                    <defs>
                      <linearGradient
                        id="netGradientPos"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4ade80"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4ade80"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
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
                        fontFamily: "'Sora',sans-serif",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: "#52525b",
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={shortFmt}
                    />
                    <Tooltip
                      content={<DarkTooltip />}
                      cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      name="Net"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#netGradientPos)"
                      dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#818cf8", strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartPanel>

            {/* ── Two-column: Expense Pie + Income Pie ── */}
            <div className="grid md:grid-cols-2 gap-5">
              <ChartPanel
                title="Expenses by Category"
                subtitle="Where your money went"
              >
                {hasExpenses ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={expenseCategories}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {expenseCategories.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              INCOME_PIE_COLORS[i % INCOME_PIE_COLORS.length]
                            }
                            opacity={0.88}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{
                          fontSize: 11,
                          color: "#71717a",
                          fontFamily: "'Sora',sans-serif",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart msg="No expense data for this period" />
                )}
              </ChartPanel>

              <ChartPanel
                title="Income by Source"
                subtitle="Where your money came from"
              >
                {incomeCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={incomeCategories}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {incomeCategories.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              [
                                "#4ade80",
                                "#34d399",
                                "#6ee7b7",
                                "#a7f3d0",
                                "#bbf7d0",
                              ][i % 5]
                            }
                            opacity={0.88}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={7}
                        wrapperStyle={{
                          fontSize: 11,
                          color: "#71717a",
                          fontFamily: "'Sora',sans-serif",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart msg="No income data for this period" />
                )}
              </ChartPanel>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CATEGORY BREAKDOWN TABLE
        ══════════════════════════════════════════════════════════════════ */}
        {hasExpenses && (
          <div>
            <SectionLabel>Expense Breakdown</SectionLabel>
            <div
              className="rounded-xl border border-[#27272a] overflow-hidden"
              style={{
                background: "linear-gradient(145deg,#18181b 0%,#141416 100%)",
              }}
            >
              {/* Table head */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#27272a] bg-[#0f0f11]/60">
                {["Category", "Amount", "Share", "Bar"].map((h) => (
                  <p
                    key={h}
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b] last:hidden sm:last:block"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {h}
                  </p>
                ))}
              </div>

              {/* Rows */}
              {expenseCategories.map((cat, idx) => {
                const sharePct = pct(cat.total, stats.expense);
                const accentColor = PIE_COLORS[idx % PIE_COLORS.length];
                return (
                  <div
                    key={cat.category}
                    className={[
                      "grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center",
                      "px-5 py-3 border-b border-[#27272a]/40 last:border-0",
                      "hover:bg-[#1a1a1e] transition-colors duration-100",
                      idx % 2 !== 0 ? "bg-white/[0.01]" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: accentColor }}
                      />
                      <span
                        className="text-sm text-[#e4e4e7] font-medium truncate"
                        style={{ fontFamily: "'Sora', sans-serif" }}
                      >
                        {cat.category}
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold tabular-nums text-[#f87171]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {inrFmt(cat.total)}
                    </span>
                    <span
                      className="text-[11px] tabular-nums text-[#71717a] w-10 text-right"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {sharePct}%
                    </span>
                    <div className="w-24 hidden sm:block">
                      <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sharePct}%`,
                            background: accentColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Totals row */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-t border-[#3f3f46]/40 bg-[#0f0f11]/40">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Total
                </span>
                <span
                  className="text-sm font-semibold tabular-nums text-[#e4e4e7]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {inrFmt(stats.expense)}
                </span>
                <span
                  className="text-[11px] tabular-nums text-[#52525b] w-10 text-right"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  100%
                </span>
                <div className="hidden sm:block w-24" />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PEAK MONTH INSIGHT (full-year only)
        ══════════════════════════════════════════════════════════════════ */}
        {hasMonthly && isFullYear && (
          <div>
            <SectionLabel>Insight</SectionLabel>
            <div
              className="rounded-xl border border-[#27272a] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{
                background: "linear-gradient(145deg,#18181b 0%,#141416 100%)",
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold text-[#e4e4e7] mb-1"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Best month in {year}
                </p>
                <p
                  className="text-[13px] text-[#71717a]"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {peakMonth.net > 0
                    ? `${peakMonth.month} had the highest net surplus.`
                    : "No profitable month found this year."}
                </p>
              </div>
              {peakMonth.net > 0 && (
                <div className="shrink-0 text-right">
                  <p
                    className="text-[11px] text-[#52525b] mb-0.5"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {peakMonth.month} surplus
                  </p>
                  <p
                    className="text-xl font-semibold tabular-nums text-[#4ade80]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    +{inrFmt(peakMonth.net)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!hasData && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <span className="text-5xl opacity-20">◉</span>
            <p
              className="text-sm font-medium text-[#a1a1aa]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              No transactions for{" "}
              {!isFullYear ? `${MONTH_LABELS[Number(monthIdx)]} ` : ""}
              {year}
            </p>
            <p
              className="text-xs text-[#52525b]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Try selecting a different year or month.
            </p>
            {!isFullYear && (
              <button
                onClick={() => setMonthIdx("")}
                className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors mt-1"
              >
                View full year →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
