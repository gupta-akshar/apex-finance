import React, { useEffect, useRef, useState } from "react";
import { useTransactions } from "../hooks/useTransactions";
import { getCategories } from "../api/categoryApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const selectCls = [
  "bg-inputBg border border-border rounded-lg px-3 py-1.5 text-sm",
  "text-primaryText placeholder:text-secondaryText",
  "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition w-full",
].join(" ");

const labelCls =
  "block text-[11px] font-semibold uppercase tracking-wider text-secondaryText/70 mb-1";

// ─── Component ────────────────────────────────────────────────────────────────
const TransactionFilters = ({ isOpen }) => {
  const { filters, setFilters } = useTransactions();
  const [categories, setCategories] = useState([]);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure real content height so the transition is exact
  useEffect(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(() => {
      setContentHeight(contentRef.current?.scrollHeight ?? 0);
    });
    ro.observe(contentRef.current);
    // Initial measurement
    setContentHeight(contentRef.current.scrollHeight);
    return () => ro.disconnect();
  }, []);

  // Load categories once
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    getCategories({ signal: controller.signal })
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (
          !cancelled &&
          err.name !== "CanceledError" &&
          err.name !== "AbortError"
        ) {
          console.error("Category load error:", err);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const filteredCategories = filters.type
    ? categories.filter((c) => c.type === filters.type)
    : categories;

  // ── Change handlers ──────────────────────────────────────────────────────

  const handleChange = (field) => (e) => {
    const value = e.target.value;

    // Month/year and date-range are mutually exclusive
    if (field === "startDate" || field === "endDate") {
      setFilters({ [field]: value, month: "", year: "" });
    } else if (field === "month" || field === "year") {
      setFilters({ [field]: value, startDate: "", endDate: "" });
    } else {
      setFilters({ [field]: value });
    }
  };

  const dateRangeActive = Boolean(filters.startDate || filters.endDate);
  const monthYearActive = Boolean(filters.month || filters.year);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{ maxHeight: isOpen ? `${contentHeight}px` : "0px" }}
      aria-hidden={!isOpen}
    >
      {/* Inner content — measured by ResizeObserver */}
      <div ref={contentRef}>
        <div className="px-6 pt-3 pb-5 border-b border-border bg-card/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Category */}
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={filters.category}
                onChange={handleChange("category")}
                className={selectCls}
              >
                <option value="">All</option>
                {filteredCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label
                className={`${labelCls} ${dateRangeActive ? "opacity-40" : ""}`}
              >
                Month
              </label>
              <select
                value={filters.month}
                onChange={handleChange("month")}
                disabled={dateRangeActive}
                className={`${selectCls} ${dateRangeActive ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <option value="">All</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label
                className={`${labelCls} ${dateRangeActive ? "opacity-40" : ""}`}
              >
                Year
              </label>
              <select
                value={filters.year}
                onChange={handleChange("year")}
                disabled={dateRangeActive}
                className={`${selectCls} ${dateRangeActive ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <option value="">All</option>
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label
                className={`${labelCls} ${monthYearActive ? "opacity-40" : ""}`}
              >
                From
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={handleChange("startDate")}
                disabled={monthYearActive}
                className={`${selectCls} ${monthYearActive ? "opacity-40 cursor-not-allowed" : ""}`}
              />
            </div>

            {/* End Date */}
            <div>
              <label
                className={`${labelCls} ${monthYearActive ? "opacity-40" : ""}`}
              >
                To
              </label>
              <input
                type="date"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={handleChange("endDate")}
                disabled={monthYearActive}
                className={`${selectCls} ${monthYearActive ? "opacity-40 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* Mutual exclusion hint */}
          {(dateRangeActive || monthYearActive) && (
            <p className="mt-2 text-[11px] text-secondaryText/60">
              {dateRangeActive
                ? "Month & Year filters are disabled while a date range is active."
                : "Date range filters are disabled while Month/Year is active."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionFilters;
