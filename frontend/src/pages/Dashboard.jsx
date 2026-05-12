import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "../hooks/useTransaction";
import { useAuth } from "../hooks/useAuth";
import TransactionModal from "../components/TransactionModal";
import SummaryCard from "../components/SummaryCard";
import { ExpensePieChart, IncomeExpenseBarChart } from "../components/Chart";

/* ─── Font injection ─────────────────────────────────────────────────────── */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Sora:wght@300;400;500;600&display=swap";

function useFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

/* ─── Greeting helper ────────────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── Date chip ──────────────────────────────────────────────────────────── */
function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ─── Format date for recent list ───────────────────────────────────────── */
const fmtDate = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yest.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/* ─── Quick Action Button ────────────────────────────────────────────────── */
const QABtn = ({ label, onClick, variant = "default", icon }) => {
  const styles = {
    income: {
      cls: "border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/10 hover:border-[#4ade80]/60",
    },
    expense: {
      cls: "border-[#f87171]/30 text-[#f87171] hover:bg-[#f87171]/10 hover:border-[#f87171]/60",
    },
    default: {
      cls: "border-[#27272a] text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-[#e4e4e7] hover:border-[#3f3f46]",
    },
  };

  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border",
        "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40",
        styles[variant]?.cls ?? styles.default.cls,
      ].join(" ")}
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {icon && <span className="text-base leading-none">{icon}</span>}
      {label}
    </button>
  );
};

/* ─── Recent transaction row ─────────────────────────────────────────────── */
const RecentRow = ({ tx }) => {
  const isIncome = tx.type === "income";
  const cat =
    tx.categoryName ||
    (typeof tx.category === "object" ? tx.category?.name : null) ||
    "Unknown";

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#27272a]/50 last:border-0 group">
      {/* Left: dot + category + date */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: isIncome ? "#4ade80" : "#f87171" }}
        />
        <div className="min-w-0">
          <p
            className="text-sm text-[#e4e4e7] font-medium truncate"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {cat}
          </p>
          {tx.note && (
            <p
              className="text-[11px] text-[#52525b] truncate max-w-[180px]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {tx.note}
            </p>
          )}
        </div>
      </div>

      {/* Right: amount + date */}
      <div className="flex items-center gap-4 shrink-0 ml-3">
        <span
          className="text-[11px] text-[#52525b]"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {fmtDate(tx.date)}
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: isIncome ? "#4ade80" : "#f87171",
          }}
        >
          {isIncome ? "+" : "−"}₹{Number(tx.amount).toLocaleString("en-IN")}
        </span>
      </div>
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DASHBOARD                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  useFonts();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transactions, loading } = useTransactions();

  const [modalMode, setModalMode] = useState(null); // "income" | "expense" | null

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance };
  }, [transactions]);

  /* ── Recent 5 ── */
  const recentTx = useMemo(() => [...transactions].slice(0, 5), [transactions]);

  /* ── Pie data ── */
  const categoryData = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (t.type !== "expense") return;
      const key =
        t.categoryName ||
        (typeof t.category === "object" ? t.category?.name : null) ||
        "Other";
      map[key] = (map[key] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  /* ── Monthly bar data ── */
  const monthlyData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const month = transactions.filter(
          (t) => new Date(t.date).getMonth() === i,
        );
        return {
          month: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][
            i
          ],
          income: month
            .filter((t) => t.type === "income")
            .reduce((s, t) => s + t.amount, 0),
          expense: month
            .filter((t) => t.type === "expense")
            .reduce((s, t) => s + t.amount, 0),
        };
      }),
    [transactions],
  );

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p
            className="text-[13px] text-[#52525b]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] text-[#e4e4e7]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* ── Ambient background ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full opacity-[0.06]"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            filter: "blur(56px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 py-8 space-y-8">
        {/* ══════════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: greeting */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-1">
              {todayLabel()}
            </p>
            <h1
              className="text-2xl sm:text-3xl font-semibold text-white leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {greeting()}
              {user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋
            </h1>
          </div>

          {/* Right: quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <QABtn
              icon="+"
              label="Income"
              variant="income"
              onClick={() => setModalMode("income")}
            />
            <QABtn
              icon="−"
              label="Expense"
              variant="expense"
              onClick={() => setModalMode("expense")}
            />
            <QABtn
              icon="↺"
              label="Recurring"
              onClick={() => navigate("/recurring")}
            />
            <QABtn
              icon="→"
              label="All Transactions"
              onClick={() => navigate("/transactions")}
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            STATS CARDS
        ══════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionLabel>Overview</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              title="Net Balance"
              value={stats.balance}
              color="text-white"
              icon="⚖"
              sub="Income minus expenses"
            />
            <SummaryCard
              title="Total Income"
              value={stats.totalIncome}
              color="text-green-400"
              icon="↑"
              sub="All time"
            />
            <SummaryCard
              title="Total Expenses"
              value={stats.totalExpense}
              color="text-red-400"
              icon="↓"
              sub="All time"
            />
            <div
              className="relative rounded-xl overflow-hidden border border-[#27272a] hover:border-[#3f3f46] transition-all duration-200 group cursor-default"
              style={{
                background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
              }}
              onClick={() => navigate("/transactions")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/transactions")}
            >
              {/* Left border accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                style={{ background: "#6366f1" }}
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at top left, rgba(99,102,241,0.12) 0%, transparent 65%)",
                }}
              />
              <div className="pl-5 pr-4 py-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717a]">
                    Transactions
                  </p>
                  <span className="text-base opacity-40 group-hover:opacity-70 transition-opacity">
                    ◈
                  </span>
                </div>
                <p
                  className="text-2xl font-semibold tabular-nums leading-none text-[#a5b4fc]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {transactions.length}
                </p>
                <p className="mt-1.5 text-[11px] text-[#52525b]">
                  Click to view all
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CHARTS + RECENT TRANSACTIONS
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Charts (2/3 width) ── */}
          <div className="lg:col-span-2 space-y-5">
            <SectionLabel>Analytics</SectionLabel>

            {/* Bar chart — full width */}
            <IncomeExpenseBarChart data={monthlyData} />

            {/* Pie chart — full width on this col */}
            <ExpensePieChart data={categoryData} />
          </div>

          {/* ── Recent Transactions (1/3 width) ── */}
          <div className="flex flex-col">
            <SectionLabel>Recent Activity</SectionLabel>

            <div
              className="rounded-xl border border-[#27272a] overflow-hidden flex-1"
              style={{
                background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
              }}
            >
              {/* Panel header */}
              <div className="px-5 pt-5 pb-4 border-b border-[#27272a]/60 flex items-center justify-between">
                <p
                  className="text-sm font-semibold text-[#e4e4e7]"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Latest transactions
                </p>
                <button
                  onClick={() => navigate("/transactions")}
                  className="text-[11px] text-[#6366f1] hover:text-[#818cf8] transition-colors font-medium"
                >
                  View all →
                </button>
              </div>

              {/* Transaction rows */}
              <div className="px-5 py-3">
                {recentTx.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl opacity-20">🗒</span>
                    <p className="text-sm text-[#52525b]">
                      No transactions yet
                    </p>
                    <button
                      onClick={() => setModalMode("expense")}
                      className="mt-2 text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
                    >
                      Add your first one →
                    </button>
                  </div>
                ) : (
                  recentTx.map((tx) => <RecentRow key={tx._id} tx={tx} />)
                )}
              </div>

              {/* Footer CTA */}
              {recentTx.length > 0 && (
                <div className="px-5 pb-5 pt-1">
                  <button
                    onClick={() => setModalMode("expense")}
                    className="w-full py-2 rounded-lg border border-dashed border-[#27272a] text-[#52525b] text-xs hover:border-[#6366f1]/40 hover:text-[#6366f1] hover:bg-[#6366f1]/5 transition-all duration-150"
                  >
                    + Add transaction
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            QUICK LINKS ROW
        ══════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionLabel>Quick access</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: "↕",
                label: "Transactions",
                to: "/transactions",
                accent: "#6366f1",
              },
              {
                icon: "◈",
                label: "Categories",
                to: "/categories",
                accent: "#a78bfa",
              },
              {
                icon: "◉",
                label: "Reports",
                to: "/reports",
                accent: "#4ade80",
              },
              {
                icon: "↺",
                label: "Recurring",
                to: "/recurring",
                accent: "#facc15",
              },
            ].map((item) => (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#27272a] hover:border-[#3f3f46] transition-all duration-150 text-left focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40"
                style={{
                  background:
                    "linear-gradient(145deg, #18181b 0%, #141416 100%)",
                }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border border-[#27272a] transition-colors duration-150 group-hover:border-[#3f3f46]"
                  style={{
                    background: `${item.accent}15`,
                    color: item.accent,
                  }}
                >
                  {item.icon}
                </span>
                <span
                  className="text-sm font-medium text-[#a1a1aa] group-hover:text-[#e4e4e7] transition-colors duration-150"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Transaction Modal ── */}
      {modalMode && (
        <TransactionModal mode={modalMode} onClose={() => setModalMode(null)} />
      )}
    </div>
  );
};

export default Dashboard;
