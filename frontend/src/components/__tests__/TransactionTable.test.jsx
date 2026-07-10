import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
// FIX: was "../src/components/TransactionTable" — wrong root.
// File lives at src/components/__tests__/, so the component is one level up.
import TransactionTable from "../TransactionTable";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeTx = (overrides = {}) => ({
  _id: "tx-001",
  type: "expense",
  amount: 1500,
  categoryName: "Food",
  note: "Lunch",
  date: new Date().toISOString(), // today
  paymentMethod: "upi",
  ...overrides,
});

const TRANSACTIONS = [
  makeTx({
    _id: "tx-001",
    type: "expense",
    categoryName: "Food",
    amount: 1500,
  }),
  makeTx({
    _id: "tx-002",
    type: "income",
    categoryName: "Salary",
    amount: 85000,
    note: "",
  }),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderTable = (props = {}) =>
  render(
    <TransactionTable
      transactions={TRANSACTIONS}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      {...props}
    />,
  );

// ══════════════════════════════════════════════════════════════════════════════
// TransactionTable
// ══════════════════════════════════════════════════════════════════════════════

describe("TransactionTable", () => {
  // ── Rendering ───────────────────────────────────────────────────────────────

  describe("row rendering", () => {
    it("renders one row per transaction", () => {
      renderTable();
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Salary")).toBeInTheDocument();
    });

    it("displays the formatted amount with correct sign", () => {
      renderTable();
      expect(screen.getByText(/−.*1,500/)).toBeInTheDocument();
      expect(screen.getByText(/\+.*85,000/)).toBeInTheDocument();
    });

    it("renders type badge for each row", () => {
      renderTable();
      expect(screen.getByText("expense")).toBeInTheDocument();
      expect(screen.getByText("income")).toBeInTheDocument();
    });

    it("shows note text when present", () => {
      renderTable();
      expect(screen.getByText("Lunch")).toBeInTheDocument();
    });

    it("renders an em-dash placeholder when note is absent", () => {
      renderTable();
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("falls back to categoryName from populated object when categoryName field absent", () => {
      const tx = makeTx({
        _id: "tx-003",
        categoryName: undefined,
        category: { _id: "cat-1", name: "Transport" },
      });
      render(
        <TransactionTable
          transactions={[tx]}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByText("Transport")).toBeInTheDocument();
    });

    it("shows 'Unknown' when both categoryName and populated category are absent", () => {
      const tx = makeTx({
        _id: "tx-004",
        categoryName: undefined,
        category: "raw-id-string",
      });
      render(
        <TransactionTable
          transactions={[tx]}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });

    it("renders 'Today' for a transaction dated today", () => {
      renderTable();
      expect(screen.getAllByText("Today").length).toBeGreaterThan(0);
    });
  });

  // ── Edit ────────────────────────────────────────────────────────────────────

  describe("edit action", () => {
    it("calls onEdit with the correct transaction when Edit is clicked", async () => {
      const onEdit = vi.fn();
      renderTable({ onEdit });

      const editButtons = screen.getAllByText("Edit");
      await userEvent.click(editButtons[0]);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(TRANSACTIONS[0]);
    });

    it("does not render Edit buttons when onEdit is not provided", () => {
      renderTable({ onEdit: undefined });
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    });
  });

  // ── Delete confirmation flow ─────────────────────────────────────────────

  describe("delete confirmation flow", () => {
    it("does not show the confirm dialog on initial render", () => {
      renderTable();
      expect(screen.queryByText("Delete transaction?")).not.toBeInTheDocument();
    });

    it("opens the confirmation dialog when Delete is clicked", async () => {
      renderTable();
      const deleteButtons = screen.getAllByText("Delete");
      await userEvent.click(deleteButtons[0]);
      expect(screen.getByText("Delete transaction?")).toBeInTheDocument();
    });

    it("calls onDelete with the transaction id after confirming", async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      renderTable({ onDelete });

      await userEvent.click(screen.getAllByText("Delete")[0]);

      // Dialog "Delete" button is the last one rendered
      const allDeleteButtons = screen.getAllByText("Delete");
      await userEvent.click(allDeleteButtons[allDeleteButtons.length - 1]);

      expect(onDelete).toHaveBeenCalledWith("tx-001");
    });

    it("dismisses the dialog without calling onDelete when Cancel is clicked", async () => {
      const onDelete = vi.fn();
      renderTable({ onDelete });

      await userEvent.click(screen.getAllByText("Delete")[0]);
      await userEvent.click(screen.getByText("Cancel"));

      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.queryByText("Delete transaction?")).not.toBeInTheDocument();
    });

    it("does not render Delete buttons when onDelete is not provided", () => {
      renderTable({ onDelete: undefined });
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  describe("empty state", () => {
    it("renders an empty table body when transactions array is empty", () => {
      render(
        <TransactionTable
          transactions={[]}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
      expect(screen.queryByText("Food")).not.toBeInTheDocument();
      expect(screen.queryByText("Salary")).not.toBeInTheDocument();
    });

    it("renders column headers even with no data", () => {
      render(
        <TransactionTable
          transactions={[]}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Amount")).toBeInTheDocument();
    });
  });
});
