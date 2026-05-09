import React from "react";
import { useTransactions } from "../hooks/useTransaction";

const btnBase =
  "px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent";

const Pagination = () => {
  const { pagination, setPage, loading } = useTransactions();
  const { page, pages, total, limit } = pagination;

  if (!total || pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Build a compact page-number list: always show first, last, current ± 1
  const pageNumbers = [];
  const delta = 1;
  const rangeStart = Math.max(2, page - delta);
  const rangeEnd = Math.min(pages - 1, page + delta);

  pageNumbers.push(1);
  if (rangeStart > 2) pageNumbers.push("…");
  for (let i = rangeStart; i <= rangeEnd; i++) pageNumbers.push(i);
  if (rangeEnd < pages - 1) pageNumbers.push("…");
  if (pages > 1) pageNumbers.push(pages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
      {/* Info */}
      <p className="text-sm text-secondaryText">
        Showing <span className="text-primaryText font-medium">{from}</span>–
        <span className="text-primaryText font-medium">{to}</span> of{" "}
        <span className="text-primaryText font-medium">{total}</span>{" "}
        transaction{total !== 1 ? "s" : ""}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1 || loading}
          className={`${btnBase} border border-border hover:bg-[#1f1f23] text-primaryText disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          ← Prev
        </button>

        {/* Page numbers */}
        {pageNumbers.map((p, idx) =>
          p === "…" ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 text-secondaryText select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              disabled={p === page || loading}
              className={`${btnBase} ${
                p === page
                  ? "bg-accent text-white cursor-default"
                  : "border border-border hover:bg-[#1f1f23] text-primaryText disabled:opacity-40"
              }`}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page === pages || loading}
          className={`${btnBase} border border-border hover:bg-[#1f1f23] text-primaryText disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default Pagination;
