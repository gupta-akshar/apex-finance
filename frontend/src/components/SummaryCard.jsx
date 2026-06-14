import React from "react";
import useFonts from "../hooks/useFonts";

/* ─── Color map ──────────────────────────────────────────────────────────── */
const COLOR_MAP = {
  "text-white": {
    border: "#6366f1",
    glow: "rgba(99,102,241,0.12)",
    text: "#e4e4e7",
  },
  "text-green-400": {
    border: "#4ade80",
    glow: "rgba(74,222,128,0.10)",
    text: "#4ade80",
  },
  "text-red-400": {
    border: "#f87171",
    glow: "rgba(248,113,113,0.10)",
    text: "#f87171",
  },
  "text-blue-400": {
    border: "#60a5fa",
    glow: "rgba(96,165,250,0.10)",
    text: "#60a5fa",
  },
  "text-yellow-400": {
    border: "#facc15",
    glow: "rgba(250,204,21,0.10)",
    text: "#facc15",
  },
};

const DEFAULT_COLORS = {
  border: "#6366f1",
  glow: "rgba(99,102,241,0.12)",
  text: "#e4e4e7",
};

const SummaryCard = ({ title, value, color = "text-white", icon, sub }) => {
  useFonts();

  const { border, glow, text } = COLOR_MAP[color] ?? DEFAULT_COLORS;

  const formatted =
    typeof value === "number" ? value.toLocaleString("en-IN") : value;

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-[#27272a] transition-all duration-200 hover:border-[#3f3f46] group"
      style={{
        background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
      }}
    >
      {/* Colored left-edge accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: border }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${glow} 0%, transparent 65%)`,
        }}
      />

      {/* Content */}
      <div className="pl-5 pr-4 py-4 relative">
        {/* Top row: label + optional icon */}
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717a]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {title}
          </p>
          {icon && (
            <span
              className="text-base opacity-40 group-hover:opacity-70 transition-opacity"
              aria-hidden
            >
              {icon}
            </span>
          )}
        </div>

        {/* Value */}
        <p
          className="text-2xl font-semibold tabular-nums leading-none"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: text,
          }}
        >
          ₹{formatted}
        </p>

        {/* Optional sub-label */}
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
};

export default SummaryCard;
