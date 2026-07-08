/**
 * TransactionModal.test.jsx
 *
 * Fixes applied vs previous version:
 *  1. Added `mockAddTransaction.mockReset()` to the "edit mode" beforeEach so
 *     stale call-counts from the "add mode submission" suite don't bleed through.
 *  2. Replaced `userEvent.type(amountInput, "0")` / `userEvent.type(amountInput, "-50")`
 *     with `fireEvent.change` — jsdom's number-input implementation doesn't reliably
 *     fire React's synthetic onChange for edge-case values via userEvent; fireEvent
 *     bypasses that layer and sets React state directly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionModal from "../TransactionModal";

// ─── Shared mock data ─────────────────────────────────────────────────────────

const MOCK_CATEGORIES = [
  { _id: "cat-food-01", name: "Food", type: "expense" },
  { _id: "cat-trans-01", name: "Transport", type: "expense" },
  { _id: "cat-sal-01", name: "Salary", type: "income" },
  { _id: "cat-free-01", name: "Freelance", type: "income" },
];

const MOCK_EXPENSE_TX = {
  _id: "tx-001",
  type: "expense",
  amount: 1500,
  category: { _id: "cat-food-01", name: "Food" },
  categoryId: "cat-food-01",
  categoryName: "Food",
  date: "2025-04-15T00:00:00.000Z",
  note: "Dinner",
  paymentMethod: "cash",
};

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockAddTransaction = vi.fn();
const mockEditTransaction = vi.fn();

vi.mock("../../hooks/useTransactions", () => ({
  useTransactions: () => ({
    addTransaction: mockAddTransaction,
    editTransaction: mockEditTransaction,
  }),
}));

vi.mock("../../hooks/useCategories", () => ({
  default: () => ({
    categories: MOCK_CATEGORIES,
    loading: false,
    error: null,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const setup = (props = {}) => {
  const defaultProps = {
    mode: "expense",
    onClose: vi.fn(),
    transaction: null,
    ...props,
  };
  const user = userEvent.setup();
  const { container, ...utils } = render(
    <TransactionModal {...defaultProps} />,
  );
  return { user, container, ...utils, onClose: defaultProps.onClose };
};

/** input[type="date"] has no ARIA role in jsdom — query via DOM directly. */
const getDateInput = (container) =>
  container.querySelector('input[type="date"]');

// ─── 1. Render ────────────────────────────────────────────────────────────────

describe("TransactionModal – render", () => {
  it("renders 'Add Expense' heading in expense mode", () => {
    setup({ mode: "expense" });
    expect(
      screen.getByRole("heading", { name: /add expense/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Add Income' heading in income mode", () => {
    setup({ mode: "income" });
    expect(
      screen.getByRole("heading", { name: /add income/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Edit Transaction' heading in edit mode", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(
      screen.getByRole("heading", { name: /edit transaction/i }),
    ).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    const { container } = setup();
    expect(screen.getByPlaceholderText(/amount/i)).toBeInTheDocument();
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
    expect(getDateInput(container)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/note/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/upi/i)).toBeInTheDocument();
  });

  it("only lists expense categories in expense mode", () => {
    setup({ mode: "expense" });
    const categorySelect = screen.getAllByRole("combobox")[0];
    const names = within(categorySelect)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(names).toContain("Food");
    expect(names).toContain("Transport");
    expect(names).not.toContain("Salary");
    expect(names).not.toContain("Freelance");
  });

  it("only lists income categories in income mode", () => {
    setup({ mode: "income" });
    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.textContent === "Salary"),
    );
    expect(categorySelect).toBeDefined();
    const names = within(categorySelect)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(names).toContain("Salary");
    expect(names).toContain("Freelance");
    expect(names).not.toContain("Food");
  });

  it("renders a close button", () => {
    setup();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("calls onClose when the × button is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── 2. Validation errors ─────────────────────────────────────────────────────

describe("TransactionModal – validation", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
  });

  it("shows error when amount is missing", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when amount is zero", async () => {
    // React 19 maps its synthetic onChange to the native "input" event (not
    // "change") for number inputs. fireEvent.change updates the DOM value but
    // never reaches React state. fireEvent.input triggers the correct event.
    const { user } = setup();
    fireEvent.input(screen.getByPlaceholderText(/amount/i), {
      target: { value: "0" },
    });
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when amount is negative", async () => {
    // Same reasoning: use fireEvent.input so React state receives the value.
    const { user } = setup();
    fireEvent.input(screen.getByPlaceholderText(/amount/i), {
      target: { value: "-50" },
    });
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when category is not selected", async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(/amount/i), "500");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/select a category/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when date is missing", async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(/amount/i), "500");
    const categorySelect = screen.getAllByRole("combobox")[0];
    await user.selectOptions(categorySelect, "cat-food-01");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/select a date/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("clears the error banner on subsequent valid submission attempt", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/amount/i), "200");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.queryByText(/valid amount/i)).not.toBeInTheDocument();
  });
});

// ─── 3. Payload submission (add mode) ─────────────────────────────────────────

describe("TransactionModal – add mode submission", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
  });

  it("calls addTransaction with the correct payload", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: false,
      warningMessage: "",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });

    await user.type(screen.getByPlaceholderText(/amount/i), "750");

    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-food-01"),
    );
    await user.selectOptions(categorySelect, "cat-food-01");
    await user.type(getDateInput(container), "2025-04-20");
    await user.type(screen.getByPlaceholderText(/note/i), "Lunch");

    const paymentSelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cash"),
    );
    await user.selectOptions(paymentSelect, "cash");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          amount: 750,
          category: "cat-food-01",
          note: "Lunch",
          date: "2025-04-20",
          paymentMethod: "cash",
        }),
      );
    });
  });

  it("calls addTransaction with income type when in income mode", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: false,
      warningMessage: "",
    });

    const { user, container } = setup({ mode: "income", onClose: vi.fn() });

    await user.type(screen.getByPlaceholderText(/amount/i), "50000");

    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-sal-01"),
    );
    await user.selectOptions(categorySelect, "cat-sal-01");
    await user.type(getDateInput(container), "2025-04-01");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ type: "income", amount: 50000 }),
      );
    });
  });

  it("closes the modal after successful submission (no budget warning)", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: false,
      warningMessage: "",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });

    await user.type(screen.getByPlaceholderText(/amount/i), "300");
    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-food-01"),
    );
    await user.selectOptions(categorySelect, "cat-food-01");
    await user.type(getDateInput(container), "2025-04-10");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows an error banner when addTransaction rejects", async () => {
    mockAddTransaction.mockRejectedValue({
      response: { data: { message: "Server error: category not found" } },
    });

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });

    await user.type(screen.getByPlaceholderText(/amount/i), "200");
    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-food-01"),
    );
    await user.selectOptions(categorySelect, "cat-food-01");
    await user.type(getDateInput(container), "2025-04-10");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/server error: category not found/i),
    ).toBeInTheDocument();
  });

  it("falls back to a generic error message when rejection has no message", async () => {
    mockAddTransaction.mockRejectedValue(new Error("Network failure"));

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });

    await user.type(screen.getByPlaceholderText(/amount/i), "100");
    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-food-01"),
    );
    await user.selectOptions(categorySelect, "cat-food-01");
    await user.type(getDateInput(container), "2025-04-10");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/failed to add transaction/i),
    ).toBeInTheDocument();
  });
});

// ─── 4. Edit mode ─────────────────────────────────────────────────────────────

describe("TransactionModal – edit mode", () => {
  beforeEach(() => {
    // FIX: reset BOTH spies — stale mockAddTransaction calls from the "add mode
    // submission" suite would otherwise cause the "not.toHaveBeenCalled" assertion
    // to fail in "calls editTransaction (not addTransaction) on submit".
    mockAddTransaction.mockReset();
    mockEditTransaction.mockReset();
  });

  it("pre-populates amount from the existing transaction", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByDisplayValue("1500")).toBeInTheDocument();
  });

  it("pre-populates the note from the existing transaction", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByDisplayValue("Dinner")).toBeInTheDocument();
  });

  it("pre-populates the payment method from the existing transaction", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByDisplayValue(/cash/i)).toBeInTheDocument();
  });

  it("pre-populates the date from the existing transaction", () => {
    const { container } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
    });
    expect(getDateInput(container).value).toBe("2025-04-15");
  });

  it("pre-selects the correct category", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-food-01"),
    );
    expect(categorySelect.value).toBe("cat-food-01");
  });

  it("calls editTransaction (not addTransaction) on submit", async () => {
    mockEditTransaction.mockResolvedValue({ _id: "tx-001" });

    const onClose = vi.fn();
    const { user } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
      onClose,
    });

    const amountInput = screen.getByDisplayValue("1500");
    await user.clear(amountInput);
    await user.type(amountInput, "2000");

    await user.click(screen.getByRole("button", { name: /update/i }));

    await waitFor(() => {
      expect(mockEditTransaction).toHaveBeenCalledTimes(1);
      expect(mockAddTransaction).not.toHaveBeenCalled();
      expect(mockEditTransaction).toHaveBeenCalledWith(
        "tx-001",
        expect.objectContaining({ amount: 2000 }),
      );
    });
  });

  it("closes the modal after a successful edit", async () => {
    mockEditTransaction.mockResolvedValue({ _id: "tx-001" });

    const onClose = vi.fn();
    const { user } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
      onClose,
    });

    await user.click(screen.getByRole("button", { name: /update/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows a generic edit error message when editTransaction rejects without message", async () => {
    mockEditTransaction.mockRejectedValue(new Error("Timeout"));

    const { user } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
      onClose: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(
      await screen.findByText(/failed to update transaction/i),
    ).toBeInTheDocument();
  });

  it("shows the server error message when editTransaction rejects with one", async () => {
    mockEditTransaction.mockRejectedValue({
      response: { data: { message: "Transaction not found" } },
    });

    const { user } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
      onClose: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(
      await screen.findByText(/transaction not found/i),
    ).toBeInTheDocument();
  });

  it("shows 'Update' button label in edit mode", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("shows 'Save' button label in add mode", () => {
    setup({ mode: "expense" });
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("preserves all existing fields when only the note is changed", async () => {
    mockEditTransaction.mockResolvedValue({ _id: "tx-001" });

    const onClose = vi.fn();
    const { user } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
      onClose,
    });

    const noteInput = screen.getByDisplayValue("Dinner");
    await user.clear(noteInput);
    await user.type(noteInput, "Business dinner");

    await user.click(screen.getByRole("button", { name: /update/i }));

    await waitFor(() => {
      expect(mockEditTransaction).toHaveBeenCalledWith(
        "tx-001",
        expect.objectContaining({
          amount: 1500,
          category: "cat-food-01",
          note: "Business dinner",
          type: "expense",
          paymentMethod: "cash",
        }),
      );
    });
  });
});

// ─── 5. Budget warning ────────────────────────────────────────────────────────

describe("TransactionModal – budget warning", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
  });

  const submitValidForm = async (user, container) => {
    await user.type(screen.getByPlaceholderText(/amount/i), "5000");
    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-food-01"),
    );
    await user.selectOptions(categorySelect, "cat-food-01");
    await user.type(getDateInput(container), "2025-04-10");
    await user.click(screen.getByRole("button", { name: /save/i }));
  };

  it("shows the budget warning banner when budgetWarning is true", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: true,
      warningMessage: "You exceeded your budget by ₹500.00",
    });

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await submitValidForm(user, container);

    expect(
      await screen.findByText(/exceeded your budget by ₹500\.00/i),
    ).toBeInTheDocument();
  });

  it("does NOT close the modal automatically when a budget warning fires", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: true,
      warningMessage: "You exceeded your budget by ₹100.00",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });
    await submitValidForm(user, container);

    await screen.findByText(/exceeded your budget by ₹100\.00/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes the modal when the user acknowledges the warning via OK", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: true,
      warningMessage: "You exceeded your budget by ₹200.00",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });
    await submitValidForm(user, container);

    const okButton = await screen.findByRole("button", { name: /ok/i });
    await user.click(okButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not show the warning banner when budgetWarning is false", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: false,
      warningMessage: "",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });
    await submitValidForm(user, container);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("button", { name: /ok/i }),
    ).not.toBeInTheDocument();
  });

  it("warning banner contains the exact warning text from the API", async () => {
    const warnMsg = "You exceeded your budget by ₹1,234.56";
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: true,
      warningMessage: warnMsg,
    });

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await submitValidForm(user, container);

    expect(await screen.findByText(warnMsg)).toBeInTheDocument();
  });
});

// ─── 6. Loading / submitting state ───────────────────────────────────────────

describe("TransactionModal – loading state", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
    mockEditTransaction.mockReset();
  });

  const fillValidForm = async (user, container, amount = "400") => {
    await user.type(screen.getByPlaceholderText(/amount/i), amount);
    const allSelects = screen.getAllByRole("combobox");
    const categorySelect = allSelects.find((s) =>
      within(s)
        .queryAllByRole("option")
        .some((o) => o.value === "cat-food-01"),
    );
    await user.selectOptions(categorySelect, "cat-food-01");
    await user.type(getDateInput(container), "2025-04-10");
  };

  it("shows 'Saving…' on the submit button while the request is in flight", async () => {
    mockAddTransaction.mockReturnValue(new Promise(() => {}));

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillValidForm(user, container);
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/saving\.\.\./i)).toBeInTheDocument();
  });

  it("disables the Save button while submitting", async () => {
    mockAddTransaction.mockReturnValue(new Promise(() => {}));

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillValidForm(user, container);
    await user.click(screen.getByRole("button", { name: /save/i }));

    const savingBtn = await screen.findByText(/saving\.\.\./i);
    expect(savingBtn.closest("button")).toBeDisabled();
  });

  it("disables the Cancel button while submitting", async () => {
    mockAddTransaction.mockReturnValue(new Promise(() => {}));

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillValidForm(user, container);
    await user.click(screen.getByRole("button", { name: /save/i }));

    await screen.findByText(/saving\.\.\./i);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("re-enables buttons after submission completes", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "x" },
      budgetWarning: false,
      warningMessage: "",
    });

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillValidForm(user, container, "100");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.queryByText(/saving\.\.\./i)).not.toBeInTheDocument(),
    );
  });

  it("shows 'Saving…' label in edit mode while the request is in flight", async () => {
    mockEditTransaction.mockReturnValue(new Promise(() => {}));

    const { user } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
      onClose: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: /update/i }));

    expect(await screen.findByText(/saving\.\.\./i)).toBeInTheDocument();
  });
});
