import React, { useEffect, useState } from "react";
import API from "../api/axios";

const Recurring = () => {
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);

  // form state
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");

  const [categories, setCategories] = useState([]);

  // ================= FETCH =================
  const fetchRecurring = async () => {
    try {
      const res = await API.get("/recurring");
      setRecurring(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecurring();
    fetchCategories();
  }, []);

  // ================= ADD =================
  const handleAdd = async () => {
    if (!amount || !category || !startDate) return;

    try {
      const res = await API.post("/recurring", {
        amount: Number(amount),
        type,
        category,
        frequency,
        startDate,
        note,
      });

      setRecurring([res.data, ...recurring]);
      setIsOpen(false);

      // reset
      setAmount("");
      setCategory("");
      setStartDate("");
      setNote("");
    } catch (err) {
      console.error(err);
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this recurring transaction?")) return;

    try {
      await API.delete(`/recurring/${id}`);
      setRecurring(recurring.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  if (loading) {
    return <p className="p-6 text-secondaryText">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Recurring Transactions</h1>

        <button
          onClick={() => setIsOpen(true)}
          className="bg-accent px-4 py-2 rounded-lg text-white"
        >
          + Add Recurring
        </button>
      </div>

      {/* LIST */}
      {recurring.length === 0 ? (
        <p className="text-secondaryText">No recurring transactions yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {recurring.map((r) => (
            <div
              key={r._id}
              className="bg-card border border-border p-4 rounded-xl"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">
                    ₹{r.amount} • {r.frequency}
                  </p>
                  <p className="text-sm text-secondaryText">
                    {new Date(r.startDate).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(r._id)}
                  className="text-red-400"
                >
                  Delete
                </button>
              </div>

              <p className="text-sm mt-2 text-secondaryText">
                {r.note || "No note"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card w-[400px] p-6 rounded-xl border border-border">
            <h2 className="text-xl font-semibold mb-4">
              Add Recurring Transaction
            </h2>

            {/* Amount */}
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-inputBg border border-border rounded"
            />

            {/* Type */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-inputBg border border-border rounded"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-inputBg border border-border rounded"
            >
              <option value="">Select Category</option>
              {filteredCategories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Frequency */}
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-inputBg border border-border rounded"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>

            {/* Start Date */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-inputBg border border-border rounded"
            />

            {/* Note */}
            <input
              type="text"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full mb-3 px-3 py-2 bg-inputBg border border-border rounded"
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="border border-border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleAdd}
                className="bg-accent px-4 py-2 rounded text-white"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recurring;
