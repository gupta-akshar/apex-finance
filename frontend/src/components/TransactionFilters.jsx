import React, { useEffect, useState } from "react";
import { useTransactions } from "../hooks/useTransaction";
import { getCategories } from "../api/categoryApi";

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

const inputCls =
  "bg-inputBg border border-border rounded-lg px-3 py-2 text-primaryText placeholder:text-secondaryText text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition w-full";

const labelCls = "block text-xs text-secondaryText mb-1 font-medium";

const TransactionFilters = () => {
  const { filters, setFilters, resetFilters } = useTransactions();
  const [categories, setCategories] = useState([]);

  // Local search value so we debounce it before sending to context
  const [searchInput, setSearchInput] = useState(filters.search || "");

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.error("Categories load error:", err));
  }, []);

  // Debounce search: wait 400ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;

    // When type changes, clear category so stale cross-type category isn't sent
    if (field === "type") {
      setFilters({ type: value, category: "" });
      return;
    }

    // Month / year are linked — clearing one should not leave orphaned filter
    if (field === "month" && !value) {
      setFilters({ month: "", year: "" });
      return;
    }

    // Switching to date-range mode clears month/year and vice-versa
    if (field === "startDate" || field === "endDate") {
      setFilters({ [field]: value, month: "", year: "" });
      return;
    }
    if (field === "month" || field === "year") {
      setFilters({ [field]: value, startDate: "", endDate: "" });
      return;
    }

    setFilters({ [field]: value });
  };

  const filteredCategories = filters.type
    ? categories.filter((c) => c.type === filters.type)
    : categories;

  const hasActiveFilters =
    filters.type ||
    filters.category ||
    filters.startDate ||
    filters.endDate ||
    filters.month ||
    filters.year ||
    filters.search ||
    filters.sort !== "latest";

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
      {/* Row 1: Search + Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className={labelCls}>Search</label>
          <input
            type="text"
            placeholder="Search by category or note…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Sort */}
        <div>
          <label className={labelCls}>Sort By</label>
          <select
            value={filters.sort}
            onChange={handleChange("sort")}
            className={inputCls}
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className={labelCls}>Type</label>
          <select
            value={filters.type}
            onChange={handleChange("type")}
            className={inputCls}
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </div>

      {/* Row 2: Category + Month + Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Category */}
        <div>
          <label className={labelCls}>Category</label>
          <select
            value={filters.category}
            onChange={handleChange("category")}
            className={inputCls}
          >
            <option value="">All Categories</option>
            {filteredCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div>
          <label className={labelCls}>Month</label>
          <select
            value={filters.month}
            onChange={handleChange("month")}
            className={inputCls}
            disabled={Boolean(filters.startDate || filters.endDate)}
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className={labelCls}>Year</label>
          <select
            value={filters.year}
            onChange={handleChange("year")}
            className={inputCls}
            disabled={Boolean(filters.startDate || filters.endDate)}
          >
            <option value="">All Years</option>
            {YEARS.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={handleChange("startDate")}
            className={inputCls}
            disabled={Boolean(filters.month || filters.year)}
          />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={handleChange("endDate")}
            className={inputCls}
            disabled={Boolean(filters.month || filters.year)}
          />
        </div>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSearchInput("");
              resetFilters();
            }}
            className="text-sm text-accent hover:text-accentHover transition underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;
