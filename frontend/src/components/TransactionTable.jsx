import React, { useState } from "react";
import DeleteConfirm from "./DeleteConfirm";

const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * TransactionTable — compact row density, horizontal scroll on small screens.
 *
 * Accepts normalized transactions where `categoryName` is set by TransactionProvider.
 */
const TransactionTable = ({ transactions, onDelete }) => {
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget._id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse">
            {/* ── Head ── */}
            <thead>
              <tr className="border-b border-border bg-inputBg">
                {[
                  "Category",
                  "Type",
                  "Amount",
                  "Note",
                  "Date",
                  onDelete && "",
                ].map(
                  (h, i) =>
                    h !== undefined && (
                      <th
                        key={i}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-secondaryText/70"
                      >
                        {h}
                      </th>
                    ),
                )}
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {transactions.map((tx, idx) => {
                const isIncome = tx.type === "income";
                const categoryLabel =
                  tx.categoryName ||
                  (typeof tx.category === "object"
                    ? tx.category?.name
                    : null) ||
                  "Unknown";

                return (
                  <tr
                    key={tx._id}
                    className={[
                      "border-b border-border/50 hover:bg-[#1c1c1f] transition-colors duration-100",
                      idx % 2 === 0 ? "" : "bg-white/[0.015]",
                    ].join(" ")}
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-primaryText whitespace-nowrap">
                      {categoryLabel}
                    </td>

                    <td className="px-4 py-2.5">
                      <span
                        className={[
                          "inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize",
                          isIncome
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400",
                        ].join(" ")}
                      >
                        {tx.type}
                      </span>
                    </td>

                    <td
                      className={[
                        "px-4 py-2.5 text-sm font-semibold tabular-nums whitespace-nowrap",
                        isIncome ? "text-green-400" : "text-red-400",
                      ].join(" ")}
                    >
                      {isIncome ? "+" : "−"}₹
                      {Number(tx.amount).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-2.5 text-sm text-secondaryText max-w-[160px] truncate">
                      {tx.note || <span className="opacity-30">—</span>}
                    </td>

                    <td className="px-4 py-2.5 text-sm text-secondaryText whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>

                    {onDelete && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              _id: tx._id,
                              label: tx.categoryName || "this transaction",
                            })
                          }
                          className="text-[11px] text-secondaryText/50 hover:text-red-400
                                   transition-colors px-2 py-0.5 rounded hover:bg-red-400/10"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirm
          title="Delete transaction?"
          name={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default TransactionTable;
