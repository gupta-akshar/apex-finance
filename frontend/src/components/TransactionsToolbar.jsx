import React, { useState, useEffect, useCallback } from "react";
import { useTransactions } from "../hooks/useTransactions";
import { DEFAULT_FILTERS } from "../constants/transactionFilters.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count how many non-default advanced filter values are active */
const countAdvancedActive = (filters) => {
  const advanced = ["category", "month", "year", "startDate", "endDate"];
  return advanced.filter((k) => filters[k] && filters[k] !== DEFAULT_FILTERS[k])
    .length;
};

const selectCls =
  "bg-inputBg border border-border rounded-lg px-3 py-1.5 text-sm text-primaryText focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition";

// ─── Component ────────────────────────────────────────────────────────────────

const TransactionsToolbar = ({ showAdvanced, onToggleAdvanced }) => {
  const { filters, setFilters, resetFilters } = useTransactions();

  // Debounced search local state
  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Scroll-based compactness
  const [isScrolled, setIsScrolled] = useState(false);

  // The scrollable main element is `ml-64 overflow-y-auto` — we listen on
  // the window scroll since the whole page scrolls inside main.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sync local search → context with 400ms debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Keep local search in sync if filters reset externally
  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const advancedCount = countAdvancedActive(filters);
  const hasAnyFilter =
    advancedCount > 0 ||
    filters.type ||
    filters.search ||
    filters.sort !== "latest";

  const handleReset = useCallback(() => {
    setSearchInput("");
    resetFilters();
  }, [resetFilters]);

  return (
    <div
      className={[
        "sticky top-0 z-10 bg-background/95 backdrop-blur-sm",
        "border-b border-border",
        "transition-all duration-200",
        isScrolled ? "py-2 shadow-lg shadow-black/20" : "py-4",
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-wrap items-center gap-2",
          isScrolled ? "px-6" : "px-6",
        ].join(" ")}
      >
        {/* ── Search ── */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondaryText text-xs pointer-events-none">
            ⌕
          </span>
          <input
            type="text"
            placeholder="Search transactions…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={[
              "w-full pl-7 pr-3 py-1.5 text-sm rounded-lg",
              "bg-inputBg border border-border text-primaryText",
              "placeholder:text-secondaryText",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition",
            ].join(" ")}
          />
        </div>

        {/* ── Type ── */}
        <select
          value={filters.type}
          onChange={(e) => setFilters({ type: e.target.value, category: "" })}
          className={selectCls}
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        {/* ── Sort ── */}
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value })}
          className={selectCls}
        >
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>

        {/* ── Advanced toggle ── */}
        <button
          onClick={onToggleAdvanced}
          className={[
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
            "border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent",
            showAdvanced
              ? "bg-accent/10 border-accent text-accent"
              : "border-border text-secondaryText hover:text-primaryText hover:border-primaryText/30",
          ].join(" ")}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4h18M6 8h12M10 12h4"
            />
          </svg>
          Filters
          {advancedCount > 0 && (
            <span className="ml-0.5 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {advancedCount}
            </span>
          )}
        </button>

        {/* ── Reset (only when something is active) ── */}
        {hasAnyFilter && (
          <button
            onClick={handleReset}
            className="text-xs text-secondaryText hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-400/10"
          >
            ✕ Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default TransactionsToolbar;
