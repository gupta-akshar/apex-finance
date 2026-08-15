import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import TransactionTable from "../TransactionTable";

const makeTx = (overrides = {}) => ({
  _id: "tx-001",
  type: "expense",
  amount: 1500,
  categoryName: "Food",
  note: "Lunch",
  date: new Date().toISOString(),
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

const renderTable = (props = {}) =>
  render(
    <TransactionTable
      transactions={TRANSACTIONS}
      onDelete={vi.fn()}
      onEdit={vi.fn()}
      {...props}
    />,
  );

describe("TransactionTable", () => {
  describe("row rendering", () => {
    it("renders one row per transaction", () => {
      renderTable();
      expect(screen.getByText("Food")).toBeInTheDocument();
      expect(screen.getByText("Salary")).toBeInTheDocument();
    });

    it("displays formatted amount with correct sign", () => {
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

    it("renders em-dash placeholder when note is absent", () => {
      renderTable();
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThan(0);
    });

    it("falls back to category.name from populated object when categoryName absent", () => {
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

    it("shows 'Unknown' when both categoryName and populated category absent", () => {
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

    it("renders 'Today' for transaction dated today", () => {
      renderTable();
      expect(screen.getAllByText("Today").length).toBeGreaterThan(0);
    });
  });

  describe("edit action", () => {
    it("calls onEdit with correct transaction when Edit is clicked", async () => {
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

  describe("delete confirmation flow", () => {
    it("does not show confirm dialog on initial render", () => {
      renderTable();
      expect(screen.queryByText("Delete transaction?")).not.toBeInTheDocument();
    });

    it("opens confirmation dialog when Delete is clicked", async () => {
      renderTable();
      await userEvent.click(screen.getAllByText("Delete")[0]);
      expect(screen.getByText("Delete transaction?")).toBeInTheDocument();
    });

    it("calls onDelete with transaction id after confirming", async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined);
      renderTable({ onDelete });
      await userEvent.click(screen.getAllByText("Delete")[0]);
      const allDeleteButtons = screen.getAllByText("Delete");
      await userEvent.click(allDeleteButtons[allDeleteButtons.length - 1]);
      expect(onDelete).toHaveBeenCalledWith("tx-001");
    });

    it("dismisses dialog without calling onDelete when Cancel is clicked", async () => {
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

  describe("empty state", () => {
    it("renders empty table body when transactions array is empty", () => {
      render(
        <TransactionTable
          transactions={[]}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
        />,
      );
      expect(screen.queryByText("Food")).not.toBeInTheDocument();
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
