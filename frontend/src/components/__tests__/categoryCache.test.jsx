import React from "react";
import { act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import CategoryProvider from "../../context/CategoryProvider";
import useCategories from "../../hooks/useCategories";

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

// ──────────────────────────────────────────────────────────────────────────────

describe("category caching behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial load ─────────────────────────────────────────────────────────

  describe("initial data fetch", () => {
    it("exposes an empty categories array while loading", async () => {
      getCategories.mockReturnValue(new Promise(() => {})); // never resolves

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

  // ── invalidate (re-fetch) — now via context, not module singleton ─────────

  describe("invalidate triggers a fresh fetch", () => {
    it("calls getCategories again when invalidate() is invoked via context", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      const { result } = renderWithProvider();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.categories).toHaveLength(2);

      // FIX: invalidate is now exposed directly through context value
      const updatedCategories = [
        ...MOCK_CATEGORIES,
        { _id: "cat-3", name: "Transport", type: "expense" },
      ];
      getCategories.mockResolvedValue(updatedCategories);

      act(() => {
        result.current.invalidate();
      });

      await waitFor(() => expect(result.current.categories).toHaveLength(3));

      expect(getCategories.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── clearCategoryCache — now a no-op, kept for back-compat ───────────────

  describe("clearCategoryCache (back-compat no-op)", () => {
    it("does not throw when called", async () => {
      const { clearCategoryCache } = await import("../../hooks/useCategories");
      expect(() => clearCategoryCache()).not.toThrow();
    });

    it("can be called multiple times without error", async () => {
      const { clearCategoryCache } = await import("../../hooks/useCategories");
      expect(() => {
        clearCategoryCache();
        clearCategoryCache();
        clearCategoryCache();
      }).not.toThrow();
    });
  });

  // ── useCategories outside provider — safe defaults ────────────────────────

  describe("useCategories hook defaults (outside provider)", () => {
    it("returns safe defaults instead of throwing when outside a provider", () => {
      // FIX: hook now returns safe defaults instead of throwing Error
      const { result } = renderHook(() => useCategories());

      expect(result.current.categories).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.invalidate).toBe("function");
    });

    it("invalidate is a safe no-op outside a provider", () => {
      const { result } = renderHook(() => useCategories());
      expect(() => result.current.invalidate()).not.toThrow();
    });
  });

  // ── Cleanup on unmount ────────────────────────────────────────────────────

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

      // After unmount, state should remain at initial empty value
      expect(result.current.categories).toEqual([]);
    });
  });

  // ── React Strict Mode / multiple provider instances ───────────────────────

  describe("React Strict Mode double-mount safety", () => {
    it("correctly fetches categories even after double-mount (no module singleton corruption)", async () => {
      getCategories.mockResolvedValue(MOCK_CATEGORIES);

      // Simulate Strict Mode double-mount by mounting, unmounting, remounting
      const { result: r1, unmount: u1 } = renderWithProvider();
      await waitFor(() => expect(r1.current.loading).toBe(false));
      u1();

      // Second mount should work correctly — not broken by module-level singleton
      getCategories.mockResolvedValue(MOCK_CATEGORIES);
      const { result: r2 } = renderWithProvider();
      await waitFor(() => expect(r2.current.loading).toBe(false));

      expect(r2.current.categories).toHaveLength(2);
    });
  });
});
