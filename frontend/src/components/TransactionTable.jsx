import React from "react";

const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
};

/**
 * TransactionTable
 *
 * Accepts normalized transaction objects where `category` may be either:
 *   - a populated object { _id, name }   (from find().populate())
 *   - a plain ObjectId string             (from aggregation without lookup)
 *
 * The TransactionProvider normalises both shapes into `categoryName`.
 */
const TransactionTable = ({ transactions, onDelete }) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead className="border-b border-border bg-inputBg">
          <tr className="text-left text-secondaryText text-sm">
            <th className="p-4">Category</th>
            <th className="p-4">Type</th>
            <th className="p-4">Amount</th>
            <th className="p-4">Note</th>
            <th className="p-4">Date</th>
            {onDelete && <th className="p-4">Action</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx._id}
              className="border-b border-border hover:bg-[#1f1f23] transition-colors"
            >
              {/* Category */}
              <td className="p-4 font-medium">
                {tx.categoryName ||
                  (typeof tx.category === "object"
                    ? tx.category?.name
                    : null) ||
                  "Unknown"}
              </td>

              {/* Type */}
              <td className="p-4 capitalize">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    tx.type === "income"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {tx.type}
                </span>
              </td>

              {/* Amount */}
              <td
                className={`p-4 font-semibold ${
                  tx.type === "expense" ? "text-red-400" : "text-green-400"
                }`}
              >
                {tx.type === "expense" ? "-" : "+"}₹
                {Number(tx.amount).toLocaleString("en-IN")}
              </td>

              {/* Note */}
              <td className="p-4 text-secondaryText text-sm max-w-[180px] truncate">
                {tx.note || "—"}
              </td>

              {/* Date */}
              <td className="p-4 text-secondaryText text-sm whitespace-nowrap">
                {formatDate(tx.date)}
              </td>

              {/* Delete */}
              {onDelete && (
                <td className="p-4">
                  <button
                    onClick={() =>
                      window.confirm("Delete this transaction?") &&
                      onDelete(tx._id)
                    }
                    className="text-red-400 hover:text-red-500 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default TransactionTable;
