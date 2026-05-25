import React from "react";
import { useTransactions } from "../hooks/useTransactions";

// ─── Sub-components ───────────────────────────────────────────────────────────

const PageBtn = ({ children, onClick, disabled, active }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={[
      "min-w-[32px] h-8 px-2 rounded-md text-sm font-medium",
      "transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-accent/50",
      active
        ? "bg-accent text-white cursor-default shadow-sm shadow-accent/30"
        : disabled
          ? "text-secondaryText/30 cursor-not-allowed"
          : "text-secondaryText hover:text-primaryText hover:bg-[#1f1f23]",
    ].join(" ")}
  >
    {children}
  </button>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const Pagination = () => {
  const { pagination, setPage, loading } = useTransactions();
  const { page, pages, total, limit } = pagination;

  if (!total || pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Compact page list: always show first, last, current ±1, with ellipsis
  const buildPages = () => {
    const items = [];
    const delta = 1;
    const rangeL = Math.max(2, page - delta);
    const rangeR = Math.min(pages - 1, page + delta);

    items.push(1);
    if (rangeL > 2) items.push("…L");
    for (let i = rangeL; i <= rangeR; i++) items.push(i);
    if (rangeR < pages - 1) items.push("…R");
    if (pages > 1) items.push(pages);

    return items;
  };

  return (
    <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Result count */}
      <p className="text-xs text-secondaryText tabular-nums">
        <span className="text-primaryText font-medium">
          {from}–{to}
        </span>{" "}
        of <span className="text-primaryText font-medium">{total}</span>{" "}
        transaction{total !== 1 ? "s" : ""}
      </p>

      {/* Buttons */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <PageBtn
          onClick={() => setPage(page - 1)}
          disabled={page === 1 || loading}
        >
          ← Prev
        </PageBtn>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Page numbers */}
        {buildPages().map((p) =>
          typeof p === "string" ? (
            <span
              key={p}
              className="px-1 text-secondaryText/40 text-sm select-none"
            >
              ···
            </span>
          ) : (
            <PageBtn
              key={p}
              active={p === page}
              disabled={p === page || loading}
              onClick={() => setPage(p)}
            >
              {p}
            </PageBtn>
          ),
        )}

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Next */}
        <PageBtn
          onClick={() => setPage(page + 1)}
          disabled={page === pages || loading}
        >
          Next →
        </PageBtn>
      </div>
    </div>
  );
};

export default Pagination;
