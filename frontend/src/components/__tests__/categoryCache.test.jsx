import React from "react";
import { act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// FIX: all three imports below were "../src/..." — wrong root.
// The test lives at src/components/__tests__/, so src-level modules are two levels up.
import CategoryProvider from "../../context/CategoryProvider";
import CategoryContext from "../../context/CategoryContext";
import useCategories, { clearCategoryCache } from "../../hooks/useCategories";

// ─── Mock API ─────────────────────────────────────────────────────────────────

vi.mock("../../api/categoryApi", () => ({
  getCategories: vi.fn(),
}));

import { getCategories } from "../../api/categoryApi";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES = [
  { _id: "cat-1", name: "Food", type: "expense" },
  { _id: "cat-2", name: "Salary", type: "income" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderWithProvider = () =>
  renderHook(() => useCategories(), {
    wrapper: ({ children }) => <CategoryProvider>{children}</CategoryProvider>,
  });

// ══════════════════════════════════════════════════════════════════════════════
// Category Cache
// ══════════════════════════════════════════════════════════════════════════════

describe("category caching behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial load ─────────────────────────────────────────────────────────

  describe("initial data fetch", () => {
    it("exposes an empty categories array while loading", async () => {
      getCategories.mockReturnValue(new Promise(() => {}));

      const { result } = renderWithProvider();

      expect(result.current.categories).toEqual([]);
      expect(result.current.loading).toBe(true);
    });

    it("populates categories after a successful fetch", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].name).toBe("Food");
    });

    it("sets error when the API call fails", async () => {
      getCategories.mockRejectedValue(new Error("Network error"));

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(result.current.categories).toEqual([]);
    });
  });

  // ── Fetch deduplication ───────────────────────────────────────────────────

  describe("fetch deduplication", () => {
    it("calls getCategories exactly once on mount", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(getCategories).toHaveBeenCalledTimes(1);
    });
  });

  // ── invalidate (re-fetch) ─────────────────────────────────────────────────

  describe("invalidate triggers a fresh fetch", () => {
    it("calls getCategories again when invalidate is invoked", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const contextResult = renderHook(
        () => React.useContext(CategoryContext),
        {
          wrapper: ({ children }) => (
            <CategoryProvider>{children}</CategoryProvider>
          ),
        },
      );

      await waitFor(() =>
        expect(contextResult.result.current.loading).toBe(false),
      );

      const updatedCategories = [
        ...MOCK_CATEGORIES,
        { _id: "cat-3", name: "Transport", type: "expense" },
      ];
      getCategories.mockResolvedValue(updatedCategories);

      act(() => {
        contextResult.result.current.invalidate();
      });

      await waitFor(() =>
        expect(contextResult.result.current.categories).toHaveLength(3),
      );

      expect(getCategories.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── clearCategoryCache ────────────────────────────────────────────────────

  describe("clearCategoryCache", () => {
    it("is a no-op function that does not throw", () => {
      expect(() => clearCategoryCache()).not.toThrow();
    });

    it("can be called multiple times without error", () => {
      expect(() => {
        clearCategoryCache();
        clearCategoryCache();
        clearCategoryCache();
      }).not.toThrow();
    });
  });

  // ── useCategories default values ─────────────────────────────────────────

  describe("useCategories hook defaults", () => {
    it("returns default context values when consumed outside a provider", () => {
      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // ── Logout invalidates category state ────────────────────────────────────

  describe("logout category invalidation", () => {
    it("resets categories to empty after clearCategoryCache + unmount", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result, unmount } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.categories).toHaveLength(2);

      act(() => {
        clearCategoryCache();
      });
      unmount();

      getCategories.mockReturnValue(new Promise(() => {}));
      const { result: freshResult } = renderWithProvider();

      expect(freshResult.current.categories).toEqual([]);
    });

    it("re-fetches categories on remount after logout", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { unmount } = renderWithProvider();
      await waitFor(() => expect(getCategories).toHaveBeenCalledTimes(1));

      unmount();
      clearCategoryCache();

      const freshCategories = [
        { _id: "cat-new", name: "Bills", type: "expense" },
      ];
      getCategories.mockResolvedValue(freshCategories);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.categories[0].name).toBe("Bills");
      expect(getCategories).toHaveBeenCalledTimes(2);
    });
  });

  // ── Abort on unmount ──────────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("does not update state after the provider is unmounted", async () => {
      let resolveCategories;
      getCategories.mockReturnValue(
        new Promise((res) => {
          resolveCategories = res;
        }),
      );

      const { result, unmount } = renderWithProvider();

      unmount();

      await act(async () => {
        resolveCategories(MOCK_CATEGORIES);
        await Promise.resolve();
      });

      expect(result.current.categories).toEqual([]);
    });
  });
});
