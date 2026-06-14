import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
} from "../api/recurringApi";
import { getCategories } from "../api/categoryApi";
import useFonts from "../hooks/useFonts";
import { TYPE_COLORS } from "../constants/colors";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const FREQUENCIES = [
  { value: "daily", label: "Daily", short: "D", color: "#38bdf8" },
  { value: "weekly", label: "Weekly", short: "W", color: "#a78bfa" },
  { value: "monthly", label: "Monthly", short: "M", color: "#6366f1" },
  { value: "yearly", label: "Yearly", short: "Y", color: "#facc15" },
];

const FREQ_MAP = Object.fromEntries(FREQUENCIES.map((f) => [f.value, f]));

const EMPTY_FORM = {
  title: "",
  type: "expense",
  amount: "",
  category: "",
  frequency: "monthly",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  note: "",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const inrFmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
};

const countdown = (dateStr) => {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  if (d < 0) return "Overdue";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d}d`;
};

const toMonthly = (amount, frequency) => {
  const a = Number(amount);
  switch (frequency) {
    case "daily":
      return a * 30;
    case "weekly":
      return (a * 52) / 12;
    case "yearly":
      return a / 12;
    default:
      return a;
  }
};

const computeNextDate = (item) => {
  const base = new Date(item.lastExecuted ?? item.startDate);
  // Work in UTC-midnight to stay timezone-safe
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );

  switch (item.frequency) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    default:
      break;
  }

  return d.toISOString();
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const resolveCategoryName = (item, categories) => {
  if (item.categoryName) return item.categoryName;
  if (typeof item.category === "object" && item.category?.name)
    return item.category.name;
  // Fallback: look up in the locally-fetched categories array
  const found = categories.find(
    (c) => c._id === item.category || c._id === item.category?._id,
  );
  return found?.name ?? "Uncategorised";
};

/* ─── Shared input class ─────────────────────────────────────────────────── */
const inputCls = [
  "w-full bg-[#0f0f11] border border-[#27272a] rounded-lg px-3 py-2",
  "text-sm text-[#e4e4e7] placeholder:text-[#52525b]",
  "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 focus:border-[#6366f1]/60",
  "transition-all duration-150",
].join(" ");

const selectCls = inputCls + " cursor-pointer";

/* ─── SectionLabel ───────────────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <p
    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52525b] mb-3"
    style={{ fontFamily: "'Sora', sans-serif" }}
  >
    {children}
  </p>
);

/* ─── FrequencyBadge ─────────────────────────────────────────────────────── */
const FrequencyBadge = ({ frequency }) => {
  const f = FREQ_MAP[frequency] ?? {
    short: "?",
    color: "#52525b",
    label: frequency,
  };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{
        borderColor: `${f.color}50`,
        background: `${f.color}12`,
        color: f.color,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {f.short} · {f.label}
    </span>
  );
};

/* ─── TypeDot ────────────────────────────────────────────────────────────── */
const TypeDot = ({ type }) => (
  <span
    className="w-1.5 h-1.5 rounded-full shrink-0"
    style={{ background: TYPE_COLORS[type]?.text ?? "#52525b" }}
  />
);

/* ─── StatusToggle ───────────────────────────────────────────────────────── */
const StatusToggle = ({ active, loading, onClick }) => (
  <button
    onClick={onClick}
    disabled={loading}
    title={active ? "Pause" : "Resume"}
    className={[
      "relative w-9 h-5 rounded-full transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50",
      "disabled:opacity-40 disabled:cursor-not-allowed shrink-0",
      active ? "bg-[#6366f1]" : "bg-[#27272a]",
    ].join(" ")}
  >
    <span
      className={[
        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
        active ? "left-[calc(100%-18px)]" : "left-0.5",
      ].join(" ")}
    />
  </button>
);

/* ─── DeleteConfirm ──────────────────────────────────────────────────────── */
const DeleteConfirm = ({ name, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
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
        Delete recurring transaction?
      </p>
      <p
        className="text-xs text-[#71717a] mb-5 leading-relaxed"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <span className="text-[#a1a1aa] font-medium">{name}</span> will be
        permanently removed. Future auto-posts will stop immediately.
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

/* ─── Field wrapper ──────────────────────────────────────────────────────── */
const Field = ({ label, error, children }) => (
  <div>
    <label
      className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#52525b] mb-1.5"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-[11px] text-[#f87171]">{error}</p>}
  </div>
);

/* ─── Inline Add / Edit Form ─────────────────────────────────────────────── */
const RecurringForm = ({
  initialData = EMPTY_FORM,
  categories,
  onSave,
  onCancel,
  loading,
  isEdit,
}) => {
  const [form, setForm] = useState(initialData);
  const [errors, setErrors] = useState({});
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const filteredCategories = useMemo(
    () => categories.filter((c) => !form.type || c.type === form.type),
    [categories, form.type],
  );

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.amount || Number(form.amount) <= 0)
      e.amount = "Enter a valid amount.";
    if (!form.category) e.category = "Select a category.";
    if (!form.startDate) e.startDate = "Start date is required.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    await onSave(form);
  };

  const tc = TYPE_COLORS[form.type];

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/5 p-5 mb-5"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6366f1] mb-4">
        {isEdit ? "Edit Recurring Transaction" : "New Recurring Transaction"}
      </p>

      {/* Row 1: Title + Amount */}
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Title" error={errors.title}>
          <input
            ref={titleRef}
            type="text"
            value={form.title}
            onChange={set("title")}
            placeholder="e.g. Netflix, Salary…"
            maxLength={60}
            className={inputCls}
            disabled={loading}
          />
        </Field>
        <Field label="Amount (₹)" error={errors.amount}>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] text-sm pointer-events-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              ₹
            </span>
            <input
              type="number"
              value={form.amount}
              onChange={set("amount")}
              placeholder="0"
              min="0.01"
              step="0.01"
              className={inputCls + " pl-7"}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              disabled={loading}
            />
          </div>
        </Field>
      </div>

      {/* Row 2: Type + Category + Frequency */}
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <Field label="Type" error={errors.type}>
          <div
            className="flex rounded-lg border border-[#27272a] overflow-hidden"
            style={{ background: "#0f0f11" }}
          >
            {["expense", "income"].map((t) => {
              const active = form.type === t;
              const c = TYPE_COLORS[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, type: t, category: "" }))
                  }
                  className="flex-1 py-2 text-xs font-medium capitalize transition-all duration-150"
                  style={{
                    background: active ? c.bg : "transparent",
                    color: active ? c.text : "#71717a",
                    borderRight: t === "expense" ? "1px solid #27272a" : "none",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Category" error={errors.category}>
          <select
            value={form.category}
            onChange={set("category")}
            className={selectCls}
            disabled={loading}
          >
            <option value="">Select…</option>
            {filteredCategories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Frequency" error={errors.frequency}>
          <select
            value={form.frequency}
            onChange={set("frequency")}
            className={selectCls}
            disabled={loading}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Row 3: Start + End + Note */}
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Field label="Start Date" error={errors.startDate}>
          <input
            type="date"
            value={form.startDate}
            onChange={set("startDate")}
            className={inputCls}
            disabled={loading}
          />
        </Field>
        <Field label="End Date (optional)" error={errors.endDate}>
          <input
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={set("endDate")}
            className={inputCls}
            disabled={loading}
          />
        </Field>
        <Field label="Note (optional)">
          <input
            type="text"
            value={form.note}
            onChange={set("note")}
            placeholder="Memo…"
            maxLength={100}
            className={inputCls}
            disabled={loading}
          />
        </Field>
      </div>

      {/* Monthly preview */}
      {form.amount && Number(form.amount) > 0 && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-[#27272a] bg-[#0f0f11]/60 flex items-center gap-2">
          <span className="text-[11px] text-[#52525b]">
            Monthly equivalent:
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: tc?.text ?? "#e4e4e7",
            }}
          >
            {inrFmt(toMonthly(form.amount, form.frequency).toFixed(0))}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Recurring"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2 rounded-lg text-sm text-[#71717a] border border-[#27272a] hover:text-[#a1a1aa] hover:border-[#3f3f46] transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

/* ─── Recurring Row ──────────────────────────────────────────────────────── */
const RecurringRow = ({
  item,
  categories,
  onEdit,
  onDelete,
  onToggle,
  toggling,
  idx,
}) => {
  const [hovered, setHovered] = useState(false);
  const isIncome = item.type === "income";
  const tc = TYPE_COLORS[item.type];
  const nextLabel = countdown(computeNextDate(item));
  const isOverdue = nextLabel === "Overdue";
  const isToday = nextLabel === "Today";

  const catName = resolveCategoryName(item, categories);

  return (
    <div
      className={[
        "relative flex flex-col sm:flex-row sm:items-center justify-between",
        "gap-3 px-5 py-3.5 border-b border-[#27272a]/40 last:border-0",
        "transition-colors duration-100",
        hovered ? "bg-[#1a1a1e]" : idx % 2 !== 0 ? "bg-white/[0.01]" : "",
        !item.isActive ? "opacity-50" : "",
      ].join(" ")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full transition-opacity duration-150"
        style={{ background: tc?.border, opacity: hovered ? 1 : 0.35 }}
      />

      {/* ── Col 1: Title + meta ── */}
      <div className="flex items-center gap-3 min-w-0 pl-2 flex-1">
        <TypeDot type={item.type} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-sm font-medium text-[#e4e4e7] truncate"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {item.title || catName}
            </p>
            <FrequencyBadge frequency={item.frequency} />
          </div>
          <p
            className="text-[11px] text-[#52525b] mt-0.5"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {catName}
            {item.note ? ` · ${item.note}` : ""}
          </p>
        </div>
      </div>

      {/* ── Col 2: Schedule info ── */}
      <div className="flex items-center gap-5 shrink-0 sm:pl-4">
        {/* Dates */}
        <div className="hidden lg:block text-right">
          <p
            className="text-[11px] text-[#52525b]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {fmtDate(item.startDate)}
            {item.endDate ? ` → ${fmtDate(item.endDate)}` : ""}
          </p>
          {nextLabel && (
            <p
              className="text-[11px] font-semibold"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: isOverdue ? "#f87171" : isToday ? "#facc15" : "#a5b4fc",
              }}
            >
              {nextLabel}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="text-right min-w-[80px]">
          <p
            className="text-sm font-semibold tabular-nums"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: tc?.text ?? "#e4e4e7",
            }}
          >
            {isIncome ? "+" : "−"}
            {inrFmt(item.amount)}
          </p>
          <p
            className="text-[10px] text-[#52525b] mt-0.5 tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {inrFmt(toMonthly(item.amount, item.frequency).toFixed(0))}/mo
          </p>
        </div>

        {/* Status toggle — uses isActive */}
        <StatusToggle
          active={item.isActive}
          loading={toggling}
          onClick={() => onToggle(item._id, item.isActive)}
        />

        {/* Action buttons */}
        <div
          className={[
            "flex items-center gap-1 transition-opacity duration-150",
            hovered ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <button
            onClick={() => onEdit(item)}
            className="text-[11px] px-2.5 py-1 rounded-md border border-[#27272a] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#3f3f46] transition-all"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            className="text-[11px] px-2.5 py-1 rounded-md border border-[#f87171]/20 text-[#f87171]/60 hover:text-[#f87171] hover:border-[#f87171]/40 hover:bg-[#f87171]/8 transition-all"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Empty state ────────────────────────────────────────────────────────── */
const EmptyState = ({ filtered, onClear, onAdd }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
    <span className="text-5xl opacity-20">↺</span>
    <p
      className="text-sm font-medium text-[#a1a1aa]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {filtered
        ? "No recurring transactions match"
        : "No recurring transactions yet"}
    </p>
    <p
      className="text-xs text-[#52525b]"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {filtered
        ? "Try a different filter or search term."
        : "Automate salaries, subscriptions, and EMIs."}
    </p>
    <div className="flex gap-3 mt-1">
      {filtered && (
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
        + Add recurring →
      </button>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RECURRING TRANSACTIONS PAGE                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
const RecurringTransactions = () => {
  useFonts();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // toggling holds the _id of the item currently mid-toggle (or null)
  const [toggling, setToggling] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [filterType, setFilterType] = useState("");
  const [filterFreq, setFilterFreq] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  /* ── Load ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [txData, catData] = await Promise.all([
          getRecurringTransactions(),
          getCategories(),
        ]);
        setItems(txData);
        setCategories(catData);
      } catch (err) {
        console.error("Failed to load recurring transactions:", err);
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, []);

  /* ── Derived: filtered list ── */
  const filtered = useMemo(() => {
    let list = items;
    if (filterType) list = list.filter((i) => i.type === filterType);
    if (filterFreq) list = list.filter((i) => i.frequency === filterFreq);
    if (filterStatus === "active") list = list.filter((i) => i.isActive);
    if (filterStatus === "paused") list = list.filter((i) => !i.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.title || "").toLowerCase().includes(q) ||
          resolveCategoryName(i, categories).toLowerCase().includes(q) ||
          (i.note || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, filterType, filterFreq, filterStatus, search, categories]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = items.filter((i) => i.isActive);
    return {
      total: items.length,
      active: active.length,
      monthlyOut: active
        .filter((i) => i.type === "expense")
        .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0),
      monthlyIn: active
        .filter((i) => i.type === "income")
        .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0),
    };
  }, [items]);

  /* ── Save (add or edit) ── */
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateRecurringTransaction(
          editTarget._id,
          formData,
        );
        setItems((prev) =>
          prev.map((i) => (i._id === editTarget._id ? updated : i)),
        );
        setEditTarget(null);
      } else {
        const added = await addRecurringTransaction(formData);
        setItems((prev) => [added, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecurringTransaction(deleteTarget._id);
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ── Toggle isActive ─────────────────────────────────────────────────────
   */
  const handleToggle = async (id, currentIsActive) => {
    const nextIsActive = !currentIsActive;

    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, isActive: nextIsActive } : i)),
    );
    setToggling(id);

    try {
      const serverDoc = await toggleRecurringTransaction(id, nextIsActive);

      setItems((prev) =>
        prev.map((i) =>
          i._id === id
            ? { ...i, isActive: serverDoc.isActive ?? nextIsActive }
            : i,
        ),
      );
    } catch (err) {
      console.error("Toggle failed:", err);
      setItems((prev) =>
        prev.map((i) =>
          i._id === id ? { ...i, isActive: currentIsActive } : i,
        ),
      );
    } finally {
      setToggling(null);
    }
  };

  /* ── Open edit ── */
  const handleEdit = (item) => {
    setEditTarget(item);
    setShowForm(true);
  };

  /* ── Reset filters ── */
  const resetFilters = () => {
    setFilterType("");
    setFilterFreq("");
    setFilterStatus("");
    setSearch("");
  };

  const isFiltered = filterType || filterFreq || filterStatus || search.trim();

  /* ── Derive form initial values from editTarget ── */
  const formInitial = editTarget
    ? {
        title: editTarget.title ?? "",
        type: editTarget.type ?? "expense",
        amount: editTarget.amount ?? "",
        category:
          typeof editTarget.category === "object"
            ? editTarget.category?._id
            : (editTarget.category ?? ""),
        frequency: editTarget.frequency ?? "monthly",
        startDate: editTarget.startDate
          ? new Date(editTarget.startDate).toISOString().split("T")[0]
          : "",
        endDate: editTarget.endDate
          ? new Date(editTarget.endDate).toISOString().split("T")[0]
          : "",
        note: editTarget.note ?? "",
      }
    : EMPTY_FORM;

  /* ── Loading ── */
  if (pageLoading) {
    return (
      <div
        className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-[3px] border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#52525b]">
            Loading recurring transactions…
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
      {/* ── Ambient orb ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div
          className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full opacity-[0.05]"
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
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b] text-xs pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={[
                "w-full pl-7 pr-3 py-1.5 text-sm rounded-lg",
                "bg-[#0f0f11] border border-[#27272a] text-[#e4e4e7]",
                "placeholder:text-[#52525b] transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40 focus:border-[#6366f1]/50",
              ].join(" ")}
            />
          </div>

          {/* Type filter chips */}
          {["", "income", "expense"].map((t) => (
            <button
              key={t || "all"}
              onClick={() => setFilterType(t)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                filterType === t
                  ? "bg-[#6366f1]/15 border-[#6366f1]/40 text-[#a5b4fc]"
                  : "border-[#27272a] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#3f3f46]",
              ].join(" ")}
            >
              {t === "" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}

          {/* Frequency filter */}
          <select
            value={filterFreq}
            onChange={(e) => setFilterFreq(e.target.value)}
            className={[
              "bg-[#0f0f11] border border-[#27272a] rounded-lg px-2.5 py-1.5",
              "text-xs text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40",
              filterFreq ? "border-[#6366f1]/40 text-[#a5b4fc]" : "",
            ].join(" ")}
          >
            <option value="">All frequencies</option>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={[
              "bg-[#0f0f11] border border-[#27272a] rounded-lg px-2.5 py-1.5",
              "text-xs text-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/40",
              filterStatus ? "border-[#6366f1]/40 text-[#a5b4fc]" : "",
            ].join(" ")}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>

          {/* Clear filters */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs text-[#52525b] hover:text-[#f87171] transition-colors px-2 py-1.5 hover:bg-[#f87171]/8 rounded-lg"
            >
              ✕ Clear
            </button>
          )}

          <div className="flex-1" />

          {/* Add button */}
          <button
            onClick={() => {
              setEditTarget(null);
              setShowForm((p) => !p);
            }}
            className={[
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium shrink-0",
              "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50",
              showForm && !editTarget
                ? "border border-[#6366f1]/40 bg-[#6366f1]/10 text-[#a5b4fc]"
                : "text-white",
            ].join(" ")}
            style={
              showForm && !editTarget
                ? {}
                : {
                    background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                    boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
                  }
            }
          >
            <span className="text-base leading-none">
              {showForm && !editTarget ? "✕" : "+"}
            </span>
            {showForm && !editTarget ? "Cancel" : "New Recurring"}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8 py-7 space-y-6">
        {/* ── Page header ── */}
        <div>
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Recurring Transactions
          </h1>
          <p className="text-sm text-[#52525b] mt-1">
            Automate salaries, subscriptions, bills, and EMIs.
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total",
              value: stats.total,
              textColor: "#a5b4fc",
              borderColor: "#6366f1",
            },
            {
              label: "Active",
              value: stats.active,
              textColor: "#4ade80",
              borderColor: "#4ade80",
            },
            {
              label: "Monthly Out",
              value: inrFmt(stats.monthlyOut.toFixed(0)),
              textColor: "#f87171",
              borderColor: "#f87171",
            },
            {
              label: "Monthly In",
              value: inrFmt(stats.monthlyIn.toFixed(0)),
              textColor: "#4ade80",
              borderColor: "#4ade80",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="relative rounded-xl border border-[#27272a] overflow-hidden px-4 py-3"
              style={{
                background: "linear-gradient(145deg,#18181b 0%,#141416 100%)",
              }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: s.borderColor }}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b] mb-1 pl-1">
                {s.label}
              </p>
              <p
                className="text-xl font-semibold tabular-nums pl-1"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: s.textColor,
                }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Inline form ── */}
        {showForm && (
          <RecurringForm
            key={editTarget?._id ?? "new"}
            initialData={formInitial}
            categories={categories}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditTarget(null);
            }}
            loading={saving}
            isEdit={Boolean(editTarget)}
          />
        )}

        {/* ── Recurring list ── */}
        {filtered.length === 0 ? (
          <EmptyState
            filtered={Boolean(isFiltered)}
            onClear={resetFilters}
            onAdd={() => {
              setEditTarget(null);
              setShowForm(true);
            }}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>
                {isFiltered
                  ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
                  : `${items.length} scheduled`}
              </SectionLabel>

              {/* Frequency legend */}
              <div className="hidden sm:flex items-center gap-2">
                {FREQUENCIES.map((f) => {
                  const count = filtered.filter(
                    (i) => i.frequency === f.value,
                  ).length;
                  if (!count) return null;
                  return (
                    <span
                      key={f.value}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border tabular-nums"
                      style={{
                        borderColor: `${f.color}40`,
                        background: `${f.color}10`,
                        color: f.color,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {f.short} {count}
                    </span>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-xl border border-[#27272a] overflow-hidden"
              style={{
                background: "linear-gradient(145deg,#18181b 0%,#141416 100%)",
              }}
            >
              {/* Table head */}
              <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 px-5 py-2.5 border-b border-[#27272a] bg-[#0f0f11]/60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b]">
                  Transaction
                </p>
                <div className="flex items-center gap-5 pr-[120px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b] hidden lg:block w-36 text-right">
                    Schedule
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#52525b] w-20 text-right">
                    Amount
                  </p>
                </div>
              </div>

              {filtered.map((item, idx) => (
                <RecurringRow
                  key={item._id}
                  item={item}
                  categories={categories}
                  idx={idx}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onToggle={handleToggle}
                  toggling={toggling === item._id}
                />
              ))}
            </div>

            <p className="text-center text-[11px] text-[#3f3f46] mt-5">
              Toggle the switch on any row to pause or resume auto-posting.
            </p>
          </div>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.title || "this transaction"}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default RecurringTransactions;
