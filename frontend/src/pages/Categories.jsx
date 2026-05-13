import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  getCategories,
  addCategoryAPI,
  deleteCategoryAPI,
} from "../api/categoryApi";

/* ─── Font injection (shared with Dashboard/Transactions) ─────────────────── */
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

/* ─── Constants ───────────────────────────────────────────────────────────── */
const TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const TYPE_COLORS = {
  income: { border: "#4ade80", bg: "rgba(74,222,128,0.08)", text: "#4ade80" },
  expense: { border: "#f87171", bg: "rgba(248,113,113,0.08)", text: "#f87171" },
};

/* ─── Shared class fragments ──────────────────────────────────────────────── */
const inputCls = [
  "w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2",
  "text-sm text-[#e4e4e7] placeholder:text-[#52525b]",
  "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1]/60",
  "transition-all duration-150",
].join(" ");

/* ─── SectionLabel ────────────────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <p
    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3"
    style={{ fontFamily: "'Sora', sans-serif" }}
  >
    {children}
  </p>
);

/* ─── TypeBadge ───────────────────────────────────────────────────────────── */
const TypeBadge = ({ type }) => {
  const c = TYPE_COLORS[type] ?? {
    border: "#52525b",
    bg: "rgba(82,82,91,0.1)",
    text: "#71717a",
  };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{ borderColor: c.border, background: c.bg, color: c.text }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: c.text }} />
      {type}
    </span>
  );
};

/* ─── Empty state ─────────────────────────────────────────────────────────── */
const EmptyState = ({ filter, onClear, onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
    <span className="text-4xl opacity-20">◈</span>
    <p
      className="text-sm font-medium text-[#a1a1aa]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {filter ? `No ${filter} categories found` : "No categories yet"}
    </p>
    <p
      className="text-xs text-[#52525b]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {filter
        ? "Try a different filter."
        : "Add your first category to get started."}
    </p>
    <div className="flex gap-2 mt-1">
      {filter && (
        <button
          onClick={onClear}
          className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
        >
          Clear filter
        </button>
      )}
      <button
        onClick={onAdd}
        className="text-xs text-[#6366f1] hover:text-[#818cf8] transition-colors"
      >
        + Add category →
      </button>
    </div>
  </div>
);

/* ─── Confirm delete dialog (inline replacement for window.confirm) ────────── */
const DeleteConfirm = ({ name, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
  >
    <div
      className="w-full max-w-sm rounded-2xl border border-[#27272a] p-6"
      style={{
        background: "#18181b",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}
    >
      <p
        className="text-sm font-semibold text-[#e4e4e7] mb-1"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        Delete category?
      </p>
      <p
        className="text-xs text-[#71717a] mb-5 leading-relaxed"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <span className="text-[#a1a1aa] font-medium">{name}</span> will be
        permanently deleted. Existing transactions using this category will keep
        their data but lose the category reference.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7] transition-all"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 rounded-lg border border-[#f87171]/30 bg-[#f87171]/10 text-sm text-[#f87171] hover:bg-[#f87171]/20 transition-all"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ─── Inline Add Form ─────────────────────────────────────────────────────── */
const AddCategoryForm = ({ onSave, onCancel, loading }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setError("");
    await onSave({ name: trimmed, type });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/5 p-5 mb-5"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6366f1] mb-4">
        New Category
      </p>

      <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-start">
        {/* Name */}
        <div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Category name…"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            maxLength={50}
            className={inputCls}
            disabled={loading}
          />
          {error && (
            <p className="mt-1.5 text-[11px] text-[#f87171]">{error}</p>
          )}
        </div>

        {/* Type toggle */}
        <div
          className="flex rounded-lg border border-[#27272a] overflow-hidden shrink-0"
          style={{ background: "#0f0f11" }}
        >
          {["expense", "income"].map((t) => {
            const active = type === t;
            const c = TYPE_COLORS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="px-3 py-2 text-xs font-medium capitalize transition-all duration-150"
                style={{
                  background: active ? c.bg : "transparent",
                  color: active ? c.text : "#71717a",
                  borderRight: t === "expense" ? "1px solid #27272a" : "none",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Save */}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {loading ? "Saving…" : "Save"}
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm text-[#71717a] border border-[#27272a] hover:text-[#a1a1aa] hover:border-[#3f3f46] transition-all duration-150 shrink-0"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

/* ─── Category Row ────────────────────────────────────────────────────────── */
const CategoryRow = ({ cat, onDelete, idx }) => {
  const [hovered, setHovered] = useState(false);
  const c = TYPE_COLORS[cat.type] ?? { border: "#52525b" };
  const createdAt = cat.createdAt
    ? new Date(cat.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={[
        "relative flex items-center justify-between px-4 py-3",
        "border-b border-[#27272a]/40 last:border-0 transition-colors duration-100",
        hovered ? "bg-[#1a1a1e]" : idx % 2 !== 0 ? "bg-white/[0.01]" : "",
      ].join(" ")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent dot */}
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
        style={{
          background: c.border,
          opacity: hovered ? 1 : 0.4,
          transition: "opacity 0.15s",
        }}
      />

      {/* Info */}
      <div className="flex items-center gap-3 min-w-0 pl-2">
        <p
          className="text-sm font-medium text-[#e4e4e7] truncate"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {cat.name}
        </p>
        {createdAt && (
          <span
            className="hidden sm:inline text-[11px] text-[#3f3f46]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Added {createdAt}
          </span>
        )}
      </div>

      {/* Right: badge + delete */}
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <TypeBadge type={cat.type} />
        <button
          onClick={() => onDelete(cat)}
          className={[
            "text-[11px] px-2.5 py-1 rounded-md border transition-all duration-150",
            hovered
              ? "border-[#f87171]/30 text-[#f87171] bg-[#f87171]/8"
              : "border-transparent text-[#3f3f46]",
          ].join(" ")}
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CATEGORIES PAGE                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
const Categories = () => {
  useFonts();

  const [categories, setCategories] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { _id, name }
  const [filterType, setFilterType] = useState(""); // "" | "income" | "expense"
  const [search, setSearch] = useState("");

  /* ── Load ── */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, []);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    let list = categories;
    if (filterType) list = list.filter((c) => c.type === filterType);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [categories, filterType, search]);

  /* ── Grouped by type ── */
  const grouped = useMemo(() => {
    const income = filtered.filter((c) => c.type === "income");
    const expense = filtered.filter((c) => c.type === "expense");
    return { income, expense };
  }, [filtered]);

  /* ── Counts ── */
  const counts = useMemo(
    () => ({
      total: categories.length,
      income: categories.filter((c) => c.type === "income").length,
      expense: categories.filter((c) => c.type === "expense").length,
    }),
    [categories],
  );

  /* ── Save ── */
  const handleSave = async ({ name, type }) => {
    setSaving(true);
    try {
      const added = await addCategoryAPI({ name, type });
      setCategories((prev) => [...prev, added]);
      setShowForm(false);
    } catch (err) {
      console.error("Failed to add category:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategoryAPI(deleteTarget._id);
      setCategories((prev) => prev.filter((c) => c._id !== deleteTarget._id));
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ── Loading skeleton ── */
  if (pageLoading) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#52525b]">Loading categories…</p>
        </div>
      </div>
    );
  }

  const hasResults = filtered.length > 0;
  //const isFiltered = filterType !== "" || search.trim() !== "";

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
          className="absolute -top-20 -right-20 w-[360px] h-[360px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STICKY TOOLBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-10 border-b border-[#27272a] bg-[#0a0a0c]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left: type filter chips */}
          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_OPTIONS.map((opt) => {
              const active = filterType === opt.value;
              const count =
                opt.value === ""
                  ? counts.total
                  : opt.value === "income"
                    ? counts.income
                    : counts.expense;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40",
                    active
                      ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
                      : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]",
                  ].join(" ")}
                >
                  {opt.label}
                  <span
                    className={[
                      "text-[10px] rounded-full px-1.5 py-px font-semibold tabular-nums",
                      active
                        ? "bg-[#6366f1]/30 text-[#a5b4fc]"
                        : "bg-[#27272a] text-[#52525b]",
                    ].join(" ")}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Center: search */}
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b] text-xs pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={[
                "w-full pl-7 pr-3 py-1.5 text-sm rounded-lg",
                "bg-[#0f0f11] border border-[#27272a] text-[#e4e4e7]",
                "placeholder:text-[#52525b]",
                "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/50",
                "transition-all duration-150",
              ].join(" ")}
            />
          </div>

          {/* Right: add button */}
          <button
            onClick={() => setShowForm((p) => !p)}
            className={[
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium shrink-0",
              "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50",
              showForm
                ? "border border-[#6366f1]/40 bg-[#6366f1]/10 text-[#a5b4fc]"
                : "text-white",
            ].join(" ")}
            style={
              showForm
                ? {}
                : {
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
                  }
            }
          >
            <span className="text-base leading-none">
              {showForm ? "✕" : "+"}
            </span>
            {showForm ? "Cancel" : "New Category"}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-7">
        {/* ── Page header ── */}
        <div className="mb-6">
          <h1
            className="text-2xl font-semibold text-white leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Categories
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            Organise your income and expense categories.
          </p>
        </div>

        {/* ── Inline Add Form ── */}
        {showForm && (
          <AddCategoryForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            loading={saving}
          />
        )}

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Total",
              value: counts.total,
              color: "#a5b4fc",
              border: "#6366f1",
            },
            {
              label: "Income",
              value: counts.income,
              color: "#4ade80",
              border: "#4ade80",
            },
            {
              label: "Expense",
              value: counts.expense,
              color: "#f87171",
              border: "#f87171",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="relative rounded-xl border border-[#27272a] overflow-hidden px-4 py-3"
              style={{
                background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: s.border }}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-1">
                {s.label}
              </p>
              <p
                className="text-xl font-semibold tabular-nums"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: s.color,
                }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Empty state ── */}
        {!hasResults && (
          <EmptyState
            filter={filterType}
            onClear={() => {
              setFilterType("");
              setSearch("");
            }}
            onAdd={() => setShowForm(true)}
          />
        )}

        {/* ── Grouped category list ── */}
        {hasResults && (
          <div className="space-y-5">
            {["income", "expense"].map((type) => {
              const items = grouped[type];
              if (!items?.length) return null;
              const c = TYPE_COLORS[type];
              return (
                <div key={type}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="h-px flex-1"
                      style={{
                        background: `linear-gradient(90deg, ${c.border}40 0%, transparent 100%)`,
                      }}
                    />
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{
                        color: c.text,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {type} · {items.length}
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, ${c.border}40 100%)`,
                      }}
                    />
                  </div>

                  {/* Rows container */}
                  <div
                    className="rounded-xl border border-[#27272a] overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(145deg, #18181b 0%, #141416 100%)",
                    }}
                  >
                    {items.map((cat, idx) => (
                      <CategoryRow
                        key={cat._id}
                        cat={cat}
                        idx={idx}
                        onDelete={setDeleteTarget}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tip footer ── */}
        {hasResults && (
          <p
            className="text-center text-[11px] text-[#3f3f46] mt-8"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Categories group your transactions and power analytics reports.
          </p>
        )}
      </div>

      {/* ── Delete confirm dialog ── */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Categories;
