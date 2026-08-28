import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
    invalidate: vi.fn(),
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
  const utils = render(<TransactionModal {...defaultProps} />);
  return { user, ...utils, onClose: defaultProps.onClose };
};

/** The first date input in the modal */
const getDateInput = (container) =>
  container.querySelector('input[type="date"]');

/**
 * Returns the category <select> — identified as the first combobox whose
 * options include one of the mock category IDs.
 */
const getCategorySelect = (container) => {
  const selects = Array.from(container.querySelectorAll("select"));
  return selects.find((s) =>
    Array.from(s.options).some((o) =>
      ["cat-food-01", "cat-sal-01"].includes(o.value),
    ),
  );
};

/** Returns the payment-method <select> */
const getPaymentSelect = (container) => {
  const selects = Array.from(container.querySelectorAll("select"));
  return selects.find((s) =>
    Array.from(s.options).some((o) => o.value === "upi"),
  );
};

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

  it("renders amount input, category select, date input, note input, payment method select", () => {
    const { container } = setup();
    expect(screen.getByPlaceholderText(/amount/i)).toBeInTheDocument();
    expect(getCategorySelect(container)).toBeTruthy();
    expect(getDateInput(container)).toBeTruthy();
    expect(screen.getByPlaceholderText(/note/i)).toBeInTheDocument();
    expect(getPaymentSelect(container)).toBeTruthy();
  });

  it("shows only expense categories in expense mode", () => {
    const { container } = setup({ mode: "expense" });
    const catSelect = getCategorySelect(container);
    const optionValues = Array.from(catSelect.options)
      .map((o) => o.value)
      .filter(Boolean);
    expect(optionValues).toContain("cat-food-01");
    expect(optionValues).toContain("cat-trans-01");
    expect(optionValues).not.toContain("cat-sal-01");
  });

  it("shows only income categories in income mode", () => {
    const { container } = setup({ mode: "income" });
    const catSelect = getCategorySelect(container);
    const optionValues = Array.from(catSelect.options)
      .map((o) => o.value)
      .filter(Boolean);
    expect(optionValues).toContain("cat-sal-01");
    expect(optionValues).toContain("cat-free-01");
    expect(optionValues).not.toContain("cat-food-01");
  });

  it("calls onClose when × button is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows 'Save' submit button in add mode", () => {
    setup({ mode: "expense" });
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
  });

  it("shows 'Update' submit button in edit mode", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });
});

// ─── 2. Validation ────────────────────────────────────────────────────────────

describe("TransactionModal – validation", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
  });

  it("shows error when amount is missing", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when amount is zero", async () => {
    const { user } = setup();
    fireEvent.input(screen.getByPlaceholderText(/amount/i), {
      target: { value: "0" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when amount is negative", async () => {
    const { user } = setup();
    fireEvent.input(screen.getByPlaceholderText(/amount/i), {
      target: { value: "-50" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when amount is Infinity (1e309)", async () => {
    const { user } = setup();
    fireEvent.input(screen.getByPlaceholderText(/amount/i), {
      target: { value: "1e309" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when amount exceeds maximum (1,000,000,000)", async () => {
    const { user } = setup();
    fireEvent.input(screen.getByPlaceholderText(/amount/i), {
      target: { value: "2000000000" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/cannot exceed/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when category is not selected", async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText(/amount/i), "500");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/select a category/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it("shows error when date is missing", async () => {
    const { user, container } = setup();
    await user.type(screen.getByPlaceholderText(/amount/i), "500");
    fireEvent.change(getCategorySelect(container), {
      target: { value: "cat-food-01" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/select a date/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });
});

// ─── 3. Add mode submission ───────────────────────────────────────────────────

describe("TransactionModal – add mode submission", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
  });

  it("calls addTransaction with correct payload", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: false,
      warningMessage: "",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });

    await user.type(screen.getByPlaceholderText(/amount/i), "750");
    fireEvent.change(getCategorySelect(container), {
      target: { value: "cat-food-01" },
    });
    fireEvent.change(getDateInput(container), {
      target: { value: "2025-04-20" },
    });
    await user.type(screen.getByPlaceholderText(/note/i), "Lunch");
    fireEvent.change(getPaymentSelect(container), {
      target: { value: "cash" },
    });

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          amount: 750,
          category: "cat-food-01",
          note: "Lunch",
          paymentMethod: "cash",
        }),
      );
    });
  });

  it("closes modal after successful submission with no budget warning", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: false,
      warningMessage: "",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });

    await user.type(screen.getByPlaceholderText(/amount/i), "300");
    fireEvent.change(getCategorySelect(container), {
      target: { value: "cat-food-01" },
    });
    fireEvent.change(getDateInput(container), {
      target: { value: "2025-04-10" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows server error message on API rejection", async () => {
    mockAddTransaction.mockRejectedValue({
      response: { data: { message: "Server error: category not found" } },
    });

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });

    await user.type(screen.getByPlaceholderText(/amount/i), "200");
    fireEvent.change(getCategorySelect(container), {
      target: { value: "cat-food-01" },
    });
    fireEvent.change(getDateInput(container), {
      target: { value: "2025-04-10" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/server error: category not found/i),
    ).toBeInTheDocument();
  });

  it("shows fallback error message when API rejection has no response body", async () => {
    mockAddTransaction.mockRejectedValue(new Error("Network failure"));

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });

    await user.type(screen.getByPlaceholderText(/amount/i), "100");
    fireEvent.change(getCategorySelect(container), {
      target: { value: "cat-food-01" },
    });
    fireEvent.change(getDateInput(container), {
      target: { value: "2025-04-10" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/failed to add transaction/i),
    ).toBeInTheDocument();
  });
});

// ─── 4. Edit mode ─────────────────────────────────────────────────────────────

describe("TransactionModal – edit mode", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
    mockEditTransaction.mockReset();
  });

  it("pre-populates amount from existing transaction", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByDisplayValue("1500")).toBeInTheDocument();
  });

  it("pre-populates note", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByDisplayValue("Dinner")).toBeInTheDocument();
  });

  it("pre-populates payment method", () => {
    const { container } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
    });
    expect(getPaymentSelect(container).value).toBe("cash");
  });

  it("pre-populates date (YYYY-MM-DD format)", () => {
    const { container } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
    });
    expect(getDateInput(container).value).toBe("2025-04-15");
  });

  it("pre-selects correct category", () => {
    const { container } = setup({
      mode: "expense",
      transaction: MOCK_EXPENSE_TX,
    });
    expect(getCategorySelect(container).value).toBe("cat-food-01");
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

  it("closes modal after successful edit", async () => {
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

  it("preserves all existing fields when only note is changed", async () => {
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

  it("shows 'Update' button label in edit mode", () => {
    setup({ mode: "expense", transaction: MOCK_EXPENSE_TX });
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("shows fallback error when edit fails", async () => {
    mockEditTransaction.mockRejectedValue(new Error("edit failed"));
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
});

// ─── 5. Budget warning ────────────────────────────────────────────────────────

describe("TransactionModal – budget warning", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
  });

  const fillAndSubmit = async (user, container) => {
    await user.type(screen.getByPlaceholderText(/amount/i), "5000");
    fireEvent.change(getCategorySelect(container), {
      target: { value: "cat-food-01" },
    });
    fireEvent.change(getDateInput(container), {
      target: { value: "2025-04-10" },
    });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
  };

  it("shows budget warning banner when budgetWarning is true", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: true,
      warningMessage: "You exceeded your budget by ₹500.00",
    });

    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillAndSubmit(user, container);

    expect(
      await screen.findByText(/exceeded your budget by ₹500\.00/i),
    ).toBeInTheDocument();
  });

  it("does NOT close modal automatically when budgetWarning is true", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: true,
      warningMessage: "You exceeded your budget by ₹100.00",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });
    await fillAndSubmit(user, container);

    await screen.findByText(/exceeded your budget by ₹100\.00/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes modal when user acknowledges warning via OK button", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: true,
      warningMessage: "You exceeded your budget by ₹200.00",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });
    await fillAndSubmit(user, container);

    const okButton = await screen.findByRole("button", { name: /^ok$/i });
    await user.click(okButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not show warning banner when budgetWarning is false", async () => {
    mockAddTransaction.mockResolvedValue({
      transaction: { _id: "new-tx" },
      budgetWarning: false,
      warningMessage: "",
    });

    const onClose = vi.fn();
    const { user, container } = setup({ mode: "expense", onClose });
    await fillAndSubmit(user, container);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("button", { name: /^ok$/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── 6. Loading state ─────────────────────────────────────────────────────────

describe("TransactionModal – loading state", () => {
  beforeEach(() => {
    mockAddTransaction.mockReset();
    mockEditTransaction.mockReset();
  });

  const fillValidForm = async (container) => {
    fireEvent.input(screen.getByPlaceholderText(/amount/i), {
      target: { value: "400" },
    });
    fireEvent.change(getCategorySelect(container), {
      target: { value: "cat-food-01" },
    });
    fireEvent.change(getDateInput(container), {
      target: { value: "2025-04-10" },
    });
  };

  it("shows 'Saving...' while request is in flight", async () => {
    mockAddTransaction.mockReturnValue(new Promise(() => {}));
    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillValidForm(container);
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText(/saving\.\.\./i)).toBeInTheDocument();
  });

  it("disables Save button while submitting", async () => {
    mockAddTransaction.mockReturnValue(new Promise(() => {}));
    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillValidForm(container);
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    const savingBtn = await screen.findByText(/saving\.\.\./i);
    expect(savingBtn.closest("button")).toBeDisabled();
  });

  it("disables Cancel button while submitting", async () => {
    mockAddTransaction.mockReturnValue(new Promise(() => {}));
    const { user, container } = setup({ mode: "expense", onClose: vi.fn() });
    await fillValidForm(container);
    await user.click(screen.getByRole("button", { name: /^save$/i }));
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
    await fillValidForm(container);
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(screen.queryByText(/saving\.\.\./i)).not.toBeInTheDocument(),
    );
  });
});
