import React, { useState, useEffect } from "react";
import { getCategories } from "../api/categoryApi";
import { useTransactions } from "../hooks/useTransactions";

// transaction prop is passed when editing an existing transaction, null when adding new
const TransactionModal = ({ mode, onClose, transaction = null }) => {
  const isEditing = Boolean(transaction);
  const isIncome = mode === "income";

  const [amount, setAmount] = useState(transaction?.amount || "");
  const [category, setCategory] = useState(transaction?.categoryId || "");
  const [date, setDate] = useState(
    transaction?.date ? transaction.date.slice(0, 10) : "",
  );
  const [note, setNote] = useState(transaction?.note || "");
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState("");

  const { addTransaction, editTransaction } = useTransactions();

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("CATEGORY ERROR:", err);
        setError("Failed to load categories.");
      }
    };
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(
    (c) => c.type === (isIncome ? "income" : "expense"),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setWarning("");
    // ...validation unchanged...
    try {
      setSubmitting(true);
      if (isEditing) {
        await editTransaction(transaction._id, payload);
        onClose();
      } else {
        const { budgetWarning, warningMessage } = await addTransaction(payload);
        if (budgetWarning && warningMessage) {
          setWarning(warningMessage); // stay open — user must dismiss
        } else {
          onClose();
        }
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (isEditing
          ? "Failed to update transaction."
          : "Failed to add transaction.");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-card w-[400px] rounded-xl p-6 border border-border"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isEditing
              ? "Edit Transaction"
              : isIncome
                ? "Add Income"
                : "Add Expense"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <p className="text-red-500 text-sm mb-3 bg-red-500/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Budget Warning Banner */}
        {warning && (
          <div
            className="flex items-start justify-between gap-3 mb-3
                  bg-yellow-500/10 border border-yellow-500/30
                  px-3 py-2 rounded-lg"
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-yellow-400 text-base leading-none mt-0.5 shrink-0">
                ⚠
              </span>
              <p className="text-yellow-400 text-sm leading-snug">{warning}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-yellow-400/60 hover:text-yellow-400 text-xs
                 border border-yellow-500/30 hover:border-yellow-500/60
                 px-2 py-1 rounded transition-colors shrink-0"
            >
              OK
            </button>
          </div>
        )}

        {/* Amount */}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          min="0.01"
          step="0.01"
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mb-3 bg-inputBg border border-border rounded-lg px-3 py-2"
        />

        {/* Category */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full mb-3 bg-inputBg border border-border rounded-lg px-3 py-2"
        >
          <option value="">
            {isIncome ? "Select Source" : "Select Category"}
          </option>
          {filteredCategories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Date */}
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full mb-3 bg-inputBg border border-border rounded-lg px-3 py-2"
        />

        {/* Note */}
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full mb-3 bg-inputBg border border-border rounded-lg px-3 py-2"
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-border rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-accent rounded-lg text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : isEditing ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionModal;
