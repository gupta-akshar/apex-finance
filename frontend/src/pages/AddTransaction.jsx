import React, { useState } from "react";
import { useTransactions } from "../context/TransactionContext";
import { useNavigate } from "react-router-dom";

const AddTransaction = () => {
  const navigate = useNavigate(); // ✅ CORRECT

  const { addTransaction } = useTransactions();
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    date: "",
    note: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.category || !formData.date) return;

    try {
      await addTransaction({
        ...formData,
        amount: Number(formData.amount),
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Add Transaction</h1>

      <div className="max-w-xl bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div>
            <label className="block mb-2 text-secondaryText">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full bg-inputBg border border-border rounded-lg px-3 py-2 text-primaryText transition-all duration-300 focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block mb-2 text-secondaryText">Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              className="w-full bg-inputBg border border-border rounded-lg px-3 py-2 text-primaryText transition-all duration-300 focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block mb-2 text-secondaryText">Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="Food, Salary, Transport..."
              className="w-full bg-inputBg border border-border rounded-lg px-3 py-2 text-primaryText transition-all duration-300 focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block mb-2 text-secondaryText">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full bg-inputBg border border-border rounded-lg px-3 py-2 text-primaryText transition-all duration-300 focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block mb-2 text-secondaryText">Description</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Optional note"
              rows="3"
              className="w-full bg-inputBg border border-border rounded-lg px-3 py-2 text-primaryText transition-all duration-300 focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="bg-accent hover:bg-accentHover px-5 py-2 rounded-lg text-white transition transform hover:scale-105"
            >
              Save
            </button>
            <button
              type="button"
              className="border border-border px-5 py-2 rounded-lg hover:bg-card transition"
              onClick={() =>
                setFormData({
                  type: "expense",
                  amount: "",
                  category: "",
                  date: "",
                  note: "",
                })
              }
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;
