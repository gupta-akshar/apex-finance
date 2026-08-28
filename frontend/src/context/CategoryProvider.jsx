import { useState, useEffect, useCallback, useRef } from "react";
import CategoryContext from "./CategoryContext";
import { getCategories } from "../api/categoryApi";

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchCategories = useCallback(async () => {
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await getCategories({ signal });
      if (!mountedRef.current || signal.aborted) return;
      setCategories(data);
    } catch (err) {
      if (!mountedRef.current || signal.aborted) return;
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load categories.",
      );
    } finally {
      if (mountedRef.current && !signal.aborted) {
        setLoading(false);
      }
    }

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cleanup;
    queueMicrotask(async () => {
      cleanup = await fetchCategories();
    });
    return () => {
      cleanup?.();
    };
  }, [fetchCategories]);

  return (
    <CategoryContext.Provider
      value={{
        categories,
        loading,
        error,

        invalidate: fetchCategories,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export default CategoryProvider;
