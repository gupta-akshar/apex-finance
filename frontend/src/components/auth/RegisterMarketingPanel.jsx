import React from "react";

const STEPS = [
  {
    num: "01",
    title: "Create your account",
    desc: "Free forever. No credit card. No hidden fees.",
    color: "#10b981",
  },
  {
    num: "02",
    title: "Add your transactions",
    desc: "Income and expenses auto-organised by category.",
    color: "#6366f1",
  },
  {
    num: "03",
    title: "Watch insights appear",
    desc: "Charts and reports update in real time as you track.",
    color: "#f59e0b",
  },
];

const BENEFITS = [
  { icon: "🔒", text: "Your data, always private" },
  { icon: "📱", text: "Works on all devices" },
  { icon: "⚡", text: "Instant setup, 2 minutes" },
  { icon: "♾️", text: "Unlimited transactions" },
];

// ── Mini mock dashboard preview ───────────────────────────────────────────────
const MiniDashboard = () => {
  const bars = [38, 55, 42, 68, 51, 77, 44, 88, 62, 59, 73, 95];
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {["#f87171", "#facc15", "#4ade80"].map((c) => (
          <span
            key={c}
            className="w-2 h-2 rounded-full"
            style={{ background: c, opacity: 0.7 }}
          />
        ))}
        <span
          className="ml-2 text-[10px] text-[#3f3f46]"
          style={{ fontFamily: "'DM Sans', monospace" }}
        >
          dashboard · your finances
        </span>
      </div>

      <div className="p-4">
        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { l: "Balance", v: "₹92,460", c: "#e4e4e7" },
            { l: "Income", v: "₹97,500", c: "#4ade80" },
            { l: "Expenses", v: "₹5,040", c: "#f87171" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg p-2.5 border"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-[9px] text-[#52525b] mb-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {s.l}
              </p>
              <p
                className="text-xs font-bold tabular-nums"
                style={{ color: s.c, fontFamily: "monospace" }}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div
          className="rounded-lg border p-3 mb-3"
          style={{
            background: "rgba(255,255,255,0.015)",
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <p
            className="text-[9px] text-[#3f3f46] uppercase tracking-wider font-semibold mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Monthly trend
          </p>
          <div className="flex items-end gap-1 h-12">
            {bars.map((h, i) => (
              <div key={i} className="flex-1">
                <div
                  className="rounded-sm transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    background:
                      i === 11
                        ? "linear-gradient(180deg, #10b981, #059669)"
                        : "rgba(16,185,129,0.2)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map(
              (m) => (
                <span
                  key={m}
                  className="text-[8px] text-[#3f3f46] flex-1 text-center"
                >
                  {m}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Recent row */}
        {[
          { label: "Salary", type: "income", amount: "+₹85,000" },
          { label: "Food", type: "expense", amount: "−₹1,240" },
        ].map((tx) => (
          <div
            key={tx.label}
            className="flex items-center justify-between px-3 py-2 rounded-lg border mb-1.5"
            style={{
              background: "rgba(255,255,255,0.015)",
              borderColor: "rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: tx.type === "income" ? "#4ade80" : "#f87171",
                }}
              />
              <span
                className="text-[11px] text-[#a1a1aa]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {tx.label}
              </span>
            </div>
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{
                color: tx.type === "income" ? "#4ade80" : "#f87171",
                fontFamily: "monospace",
              }}
            >
              {tx.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RegisterMarketingPanel = () => {
  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="left-stagger-1 flex items-center gap-3 mb-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
          }}
        >
          💸
        </div>
        <div>
          <p
            className="text-sm font-bold text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ExpenseTracker
          </p>
          <p
            className="text-[11px] text-[#52525b]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Personal Finance Platform
          </p>
        </div>
      </div>

      {/* ── Headline ── */}
      <div className="left-stagger-2 mb-8">
        <h1
          className="text-white leading-tight mb-3"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(28px, 2.8vw, 40px)",
            lineHeight: 1.15,
          }}
        >
          Your finances,
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, #10b981 0%, #34d399 50%, #a7f3d0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            finally under control.
          </span>
        </h1>
        <p
          className="text-[#71717a] text-[14px] leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: "400px" }}
        >
          Join thousands who've taken control of their spending. Free forever,
          takes 2 minutes to set up.
        </p>
      </div>

      {/* ── Dashboard preview ── */}
      <div className="left-stagger-3 mb-8">
        <MiniDashboard />
      </div>

      {/* ── How it works ── */}
      <div className="left-stagger-4 mb-8">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-4"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          How it works
        </p>
        <div className="flex flex-col gap-3">
          {STEPS.map((s) => (
            <div key={s.num} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 border"
                style={{
                  background: `${s.color}12`,
                  borderColor: `${s.color}25`,
                  color: s.color,
                  fontFamily: "monospace",
                }}
              >
                {s.num}
              </div>
              <div className="pt-0.5">
                <p
                  className="text-[12px] font-semibold text-[#d4d4d8] leading-tight"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {s.title}
                </p>
                <p
                  className="text-[11px] text-[#52525b] leading-snug"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Benefits chips ── */}
      <div className="left-stagger-5 mt-auto">
        <div className="flex flex-wrap gap-2">
          {BENEFITS.map((b) => (
            <div
              key={b.text}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "#71717a",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span>{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RegisterMarketingPanel;
