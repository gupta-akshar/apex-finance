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

  const abortRef = useRef(null);

  const fetchIdRef = useRef(0);

  const fetchCategories = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const currentId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const data = await getCategories({ signal: controller.signal });

      if (!mountedRef.current || currentId !== fetchIdRef.current) return;

      setCategories(data);
    } catch (err) {
      if (!mountedRef.current || currentId !== fetchIdRef.current) return;
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;

      console.error("CategoryProvider fetch error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load categories.",
      );
    } finally {
      if (mountedRef.current && currentId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    return () => {
      if (abortRef.current) abortRef.current.abort();
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
