import { useState, useEffect } from "react";
import { getCategories } from "../api/categoryApi";

// ─── Module-level cache (shared across all hook instances) ────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let _cache = null;
let _promise = null;

const isCacheValid = () =>
  _cache !== null && Date.now() - _cache.fetchedAt < CACHE_TTL_MS;

// ─── Hook ─────────────────────────────────────────────────────────────────────
const useCategories = () => {
  const [categories, setCategories] = useState(() =>
    isCacheValid() ? _cache.data : [],
  );
  const [loading, setLoading] = useState(() => !isCacheValid());
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cache is still warm — nothing to do
    if (isCacheValid()) {
      setCategories(_cache.data);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      // Re-use an in-flight request if another instance already started one
      if (!_promise) {
        _promise = getCategories().finally(() => {
          _promise = null;
        });
      }

      try {
        const data = await _promise;

        if (cancelled) return;

        _cache = { data, fetchedAt: Date.now() };
        setCategories(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        if (err?.name === "CanceledError" || err?.name === "AbortError") return;

        console.error("useCategories fetch error:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load categories.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
};

export default useCategories;
