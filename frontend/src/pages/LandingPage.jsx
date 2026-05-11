import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

/* ─── Google Fonts injected once ─────────────────────────────────────────── */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap";

function useFontInjection() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

/* ─── Feature card data ───────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "↕",
    title: "Smart Transaction Tracking",
    desc: "Log income and expenses with categories, notes, and payment methods. Every rupee accounted for.",
    accent: "#6366f1",
  },
  {
    icon: "◉",
    title: "Visual Analytics",
    desc: "Understand where your money goes with pie charts, bar graphs, and monthly trend lines.",
    accent: "#22c55e",
  },
  {
    icon: "↺",
    title: "Recurring Transactions",
    desc: "Set and forget — salaries, subscriptions, and EMIs auto-post on schedule.",
    accent: "#f59e0b",
  },
  {
    icon: "◈",
    title: "Budget Guardrails",
    desc: "Set category budgets and get warned before you overspend. Stay in control every month.",
    accent: "#e879f9",
  },
];

/* ─── Mock dashboard data for hero visual ────────────────────────────────── */
const MOCK_TRANSACTIONS = [
  { label: "Salary", type: "income", amount: "₹85,000", date: "Today" },
  { label: "Food", type: "expense", amount: "₹1,240", date: "Yesterday" },
  { label: "Freelance", type: "income", amount: "₹12,500", date: "May 7" },
  { label: "Bills", type: "expense", amount: "₹3,800", date: "May 6" },
];

/* ─── Stat pill ─────────────────────────────────────────────────────────────*/
const Stat = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span
      style={{ fontFamily: "'DM Serif Display', serif" }}
      className="text-2xl text-white"
    >
      {value}
    </span>
    <span className="text-xs text-[#a1a1aa] mt-0.5">{label}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LANDING PAGE                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
const LandingPage = () => {
  useFontInjection();
  const navigate = useNavigate();
  const heroRef = useRef(null);

  return (
    <div
      className="bg-[#0f0f11] text-[#e4e4e7] min-h-screen overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Ambient background orbs ────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        {/* Top-right accent orb */}
        <div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle at center, #6366f1 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />
        {/* Bottom-left warm orb */}
        <div
          className="absolute bottom-0 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle at center, #22c55e 0%, transparent 70%)",
            filter: "blur(64px)",
          }}
        />
      </div>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <div className="relative z-30">
        <Navbar />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-28 flex flex-col lg:flex-row items-center gap-16"
      >
        {/* ── Left copy ── */}
        <div className="flex-1 max-w-xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#27272a] bg-[#18181b] text-xs text-[#a1a1aa] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Personal finance, simplified
          </div>

          {/* Headline */}
          <h1
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-5xl sm:text-6xl leading-[1.1] tracking-tight text-white mb-6"
          >
            Know exactly
            <br />
            where your{" "}
            <span
              className="italic"
              style={{
                background:
                  "linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              money goes.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-[#a1a1aa] text-lg leading-relaxed mb-10 font-light">
            Track income and expenses, visualise your spending habits, and stay
            ahead of your budgets — all in one clean dashboard.
          </p>

          {/* CTA row */}
          <div className="flex flex-wrap gap-3 mb-14">
            <button
              onClick={() => navigate("/register")}
              className="group relative px-7 py-3 rounded-xl font-medium text-sm text-white overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/60 focus:ring-offset-2 focus:ring-offset-[#0f0f11]"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: "0 0 32px rgba(99,102,241,0.35)",
              }}
            >
              <span className="relative z-10">Get started free →</span>
              {/* Hover shimmer */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.08), transparent)",
                }}
              />
            </button>

            <button
              onClick={() => navigate("/login")}
              className="px-7 py-3 rounded-xl font-medium text-sm text-[#e4e4e7] border border-[#27272a] hover:border-[#3f3f46] hover:bg-[#18181b] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:ring-offset-2 focus:ring-offset-[#0f0f11]"
            >
              Sign in
            </button>
          </div>

          {/* Social proof stats */}
          <div className="flex items-center gap-8 pt-6 border-t border-[#27272a]/60">
            <Stat value="100%" label="Free to use" />
            <div className="w-px h-8 bg-[#27272a]" />
            <Stat value="∞" label="Transactions" />
            <div className="w-px h-8 bg-[#27272a]" />
            <Stat value="4" label="Chart types" />
          </div>
        </div>

        {/* ── Right: Dashboard mockup ── */}
        <div className="flex-1 w-full max-w-md lg:max-w-lg xl:max-w-xl">
          <div
            className="relative rounded-2xl border border-[#27272a] overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #18181b 0%, #121214 100%)",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Mock window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#27272a]/70">
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27272a]" />
              <span className="ml-3 text-[11px] text-[#52525b] font-mono">
                expensetracker.app/dashboard
              </span>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 p-4">
              {[
                { label: "Balance", value: "₹92,460", color: "#e4e4e7" },
                { label: "Income", value: "₹97,500", color: "#4ade80" },
                { label: "Expenses", value: "₹5,040", color: "#f87171" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3 border border-[#27272a]"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <p className="text-[10px] text-[#71717a] mb-1">{s.label}</p>
                  <p
                    className="text-base font-semibold tabular-nums"
                    style={{
                      color: s.color,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Mock bar chart */}
            <div className="px-4 pb-4">
              <div
                className="rounded-xl border border-[#27272a] p-4"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                <p className="text-[11px] text-[#52525b] mb-3 uppercase tracking-wider font-medium">
                  Monthly Trend
                </p>
                <div className="flex items-end gap-1.5 h-16">
                  {[28, 45, 35, 60, 42, 55, 38, 70, 52, 48, 65, 80].map(
                    (h, i) => (
                      <div key={i} className="flex-1 flex flex-col gap-0.5">
                        <div
                          className="rounded-sm"
                          style={{
                            height: `${h * 0.9}%`,
                            background:
                              i === 11
                                ? "linear-gradient(180deg, #818cf8, #6366f1)"
                                : "rgba(99,102,241,0.25)",
                          }}
                        />
                      </div>
                    ),
                  )}
                </div>
                <div className="flex justify-between mt-1.5">
                  {[
                    "J",
                    "F",
                    "M",
                    "A",
                    "M",
                    "J",
                    "J",
                    "A",
                    "S",
                    "O",
                    "N",
                    "D",
                  ].map((m) => (
                    <span
                      key={m}
                      className="text-[9px] text-[#3f3f46] flex-1 text-center"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Mock transaction rows */}
            <div className="px-4 pb-5 space-y-1.5">
              <p className="text-[11px] text-[#52525b] uppercase tracking-wider font-medium mb-2.5">
                Recent
              </p>
              {MOCK_TRANSACTIONS.map((tx) => (
                <div
                  key={tx.label}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#27272a]/50 hover:border-[#27272a] transition-colors"
                  style={{ background: "rgba(255,255,255,0.015)" }}
                >
                  <div>
                    <p className="text-sm text-[#d4d4d8] font-medium">
                      {tx.label}
                    </p>
                    <p className="text-[11px] text-[#52525b]">{tx.date}</p>
                  </div>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{
                      color: tx.type === "income" ? "#4ade80" : "#f87171",
                    }}
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>

            {/* Glow overlay at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, #0f0f11 0%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-24">
        {/* Section label */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6366f1] font-semibold mb-4">
            Everything you need
          </p>
          <h2
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-4xl sm:text-5xl text-white leading-tight"
          >
            Built for how you
            <br />
            actually manage money
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-[#27272a] p-6 overflow-hidden transition-all duration-200 hover:border-[#3f3f46]"
              style={{
                background: "linear-gradient(160deg, #18181b 0%, #141416 100%)",
              }}
            >
              {/* Accent glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse at top left, ${f.accent}18 0%, transparent 60%)`,
                }}
              />

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-5 border border-[#27272a]"
                style={{
                  background: `${f.accent}15`,
                  color: f.accent,
                }}
              >
                {f.icon}
              </div>

              <h3
                className="text-base font-semibold text-white mb-2 relative"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {f.title}
              </h3>
              <p className="text-sm text-[#71717a] leading-relaxed relative">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS  (3-step minimal row)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-16">
        <div
          className="rounded-2xl border border-[#27272a] p-8 sm:p-12"
          style={{
            background:
              "linear-gradient(135deg, #18181b 0%, #16161a 50%, #18181b 100%)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#6366f1] font-semibold text-center mb-10">
            How it works
          </p>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connector lines (desktop) */}
            <div
              className="hidden sm:block absolute top-6 left-[calc(16.667%+16px)] right-[calc(16.667%+16px)] h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #27272a 20%, #27272a 80%, transparent)",
              }}
            />

            {[
              {
                step: "01",
                title: "Create account",
                body: "Sign up in seconds. No credit card, no setup fees.",
              },
              {
                step: "02",
                title: "Log transactions",
                body: "Add income and expenses with category and date.",
              },
              {
                step: "03",
                title: "See insights",
                body: "Charts and reports update instantly as you log.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="flex flex-col items-center text-center"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-[#6366f1] border border-[#27272a] mb-4 relative z-10"
                  style={{
                    background: "#0f0f11",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {s.step}
                </div>
                <h3
                  className="text-white font-semibold mb-1.5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm text-[#71717a] leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-16">
        <div
          className="relative rounded-2xl overflow-hidden border border-[#6366f1]/20 px-10 py-16 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(79,70,229,0.06) 50%, rgba(99,102,241,0.1) 100%)",
          }}
        >
          {/* Background accent bleed */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 60%)",
            }}
          />

          <p className="text-xs uppercase tracking-[0.2em] text-[#818cf8] font-semibold mb-4 relative">
            Start today
          </p>
          <h2
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-4xl sm:text-5xl text-white mb-5 relative"
          >
            Ready to take control?
          </h2>
          <p className="text-[#a1a1aa] max-w-md mx-auto mb-10 font-light relative">
            Join and start understanding your finances in minutes. Free,
            private, and always yours.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 relative">
            <button
              onClick={() => navigate("/register")}
              className="group relative px-8 py-3.5 rounded-xl font-medium text-sm text-white overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/60 focus:ring-offset-2 focus:ring-offset-transparent"
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
              }}
            >
              <span className="relative z-10">Create free account →</span>
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)",
                }}
              />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3.5 rounded-xl font-medium text-sm text-[#e4e4e7] border border-[#3f3f46] hover:border-[#52525b] hover:bg-[#18181b] transition-all duration-150"
            >
              I already have an account
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-[#27272a]/60 mt-4">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">💸</span>
            <span
              className="text-sm font-semibold text-white"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              ExpenseTracker
            </span>
          </div>

          <p className="text-xs text-[#52525b] text-center">
            Built with React, Express & MongoDB.{" "}
            <span className="text-[#3f3f46]">Open source.</span>
          </p>

          <div className="flex gap-5">
            <button
              onClick={() => navigate("/login")}
              className="text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/register")}
              className="text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
