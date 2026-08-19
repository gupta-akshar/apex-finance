import React from "react";

const FEATURES = [
  {
    icon: "↕",
    color: "#10b981",
    glow: "rgba(16,185,129,0.15)",
    title: "Smart Expense Tracking",
    desc: "Log every rupee across income and expenses with categories, notes, and payment methods.",
  },
  {
    icon: "◉",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.15)",
    title: "Visual Analytics",
    desc: "Pie charts, bar graphs, and monthly trend lines that actually tell your financial story.",
  },
  {
    icon: "◈",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
    title: "Budget Guardrails",
    desc: "Set category budgets and receive warnings before you overspend — every single month.",
  },
  {
    icon: "↺",
    color: "#e879f9",
    glow: "rgba(232,121,249,0.15)",
    title: "Recurring Automation",
    desc: "Salaries, subscriptions, and EMIs auto-post on schedule. Set once, forget forever.",
  },
];

const STATS = [
  { value: "100%", label: "Free forever", color: "#10b981" },
  { value: "∞", label: "Transactions", color: "#6366f1" },
  { value: "4", label: "Chart types", color: "#f59e0b" },
  { value: "0", label: "Ads ever", color: "#e879f9" },
];

const TESTIMONIAL = {
  text: "ExpenseTracker completely changed how I manage my monthly spending. I finally know where every rupee goes.",
  author: "Akshar Gupta",
  role: "Product Engineer",
  rating: 5,
};

const LoginMarketingPanel = () => {
  return (
    <div className="flex flex-col h-full">
      {/* ── Logo + Brand ── */}
      <div className="left-stagger-1 flex items-center gap-3 mb-12">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            boxShadow:
              "0 4px 20px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          💸
        </div>
        <div>
          <p
            className="text-sm font-bold text-white leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ExpenseTracker
          </p>
          <p
            className="text-[11px] text-[#52525b] leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Personal Finance Platform
          </p>
        </div>
      </div>

      {/* ── Hero headline ── */}
      <div className="left-stagger-2 mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-5 text-xs font-medium"
          style={{
            background: "rgba(16,185,129,0.08)",
            borderColor: "rgba(16,185,129,0.2)",
            color: "#10b981",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: "pulse-ring 2s infinite" }}
          />
          Built for Indian households
        </div>

        <h1
          className="text-white leading-tight mb-4"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 3.2vw, 44px)",
            lineHeight: 1.15,
          }}
        >
          Track every rupee.
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Build real wealth.
          </span>
        </h1>

        <p
          className="text-[#71717a] leading-relaxed"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            maxWidth: "440px",
          }}
        >
          The complete financial dashboard for tracking income, expenses,
          budgets, and recurring transactions — all in one place.
        </p>
      </div>

      {/* ── Feature list ── */}
      <div className="left-stagger-3 flex flex-col gap-2 mb-10">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="feature-card flex items-start gap-4 px-4 py-3.5 rounded-xl border border-transparent"
            style={{ animationDelay: `${0.1 * i}s` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{
                background: f.glow,
                borderColor: `${f.color}30`,
                color: f.color,
              }}
            >
              {f.icon}
            </div>
            <div>
              <p
                className="text-[13px] font-semibold text-[#d4d4d8] mb-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {f.title}
              </p>
              <p
                className="text-[12px] text-[#52525b] leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats grid ── */}
      <div className="left-stagger-4 grid grid-cols-4 gap-2 mb-8">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="stat-card rounded-xl border border-[#27272a] text-center py-3 px-2"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            }}
          >
            <p
              className="text-xl font-bold leading-tight mb-0.5"
              style={{
                fontFamily: "'DM Serif Display', serif",
                color: s.color,
              }}
            >
              {s.value}
            </p>
            <p
              className="text-[10px] text-[#52525b] leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Testimonial ── */}
      <div
        className="left-stagger-5 mt-auto rounded-xl border p-5"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        {/* Stars */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: TESTIMONIAL.rating }).map((_, i) => (
            <span key={i} className="text-amber-400 text-sm">
              ★
            </span>
          ))}
        </div>

        <p
          className="text-[13px] text-[#a1a1aa] leading-relaxed mb-4 italic"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          "{TESTIMONIAL.text}"
        </p>

        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}
          >
            {TESTIMONIAL.author[0]}
          </div>
          <div>
            <p
              className="text-[12px] font-semibold text-[#d4d4d8]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {TESTIMONIAL.author}
            </p>
            <p
              className="text-[11px] text-[#52525b]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {TESTIMONIAL.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginMarketingPanel;
