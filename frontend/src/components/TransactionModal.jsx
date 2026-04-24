import React, { useState, useEffect } from "react";
import { getCategories } from "../api/categoryApi";
import { useTransactions } from "../hooks/useTransaction";

const TransactionModal = ({ mode, onClose }) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState([]);

  const { addTransaction } = useTransactions();

  const isIncome = mode === "income";
  const isExpense = mode === "expense";

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error("CATEGORY ERROR:", err);
      }
    };
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(
    (c) => c.type === (isIncome ? "income" : "expense"),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || !category || !date) {
      console.log("Missing fields");
      return;
    }

    try {
      await addTransaction({
        amount: Number(amount),
        category,
        date,
        note,
        type: isIncome ? "income" : "expense",
      });

      onClose(); // ✅ closes modal
    } catch (err) {
      console.error("CREATE ERROR:", err);
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
            {isIncome
              ? "Add Income"
              : isExpense
                ? "Add Expense"
                : "Add Recurring"}
          </h2>
          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Amount */}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
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
            className="px-4 py-2 border border-border rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-accent rounded-lg text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionModal;
