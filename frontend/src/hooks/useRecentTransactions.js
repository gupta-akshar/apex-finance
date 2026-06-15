import { useState, useEffect, useRef } from "react";
import { getTransactions } from "../api/transactionApi";

const useRecentTransactions = (limit = 5) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stable ref avoids stale-closure issues when limit changes mid-mount
  const limitRef = useRef(limit);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);

      try {
        const data = await getTransactions({
          limit: limitRef.current,
          sort: "latest",
          page: 1,
        });

        if (cancelled) return;

        const raw = data.transactions ?? [];

        const normalised = raw.map((tx) => ({
          ...tx,
          categoryName:
            typeof tx.category === "object" && tx.category !== null
              ? tx.category.name
              : (tx.category ?? "Unknown"),
          categoryId:
            typeof tx.category === "object" && tx.category !== null
              ? tx.category._id
              : tx.category,
        }));

        setTransactions(normalised);
      } catch (err) {
        if (cancelled) return;
        // Recent-activity failing is non-critical; log and leave list empty.
        console.error("useRecentTransactions error:", err);
        setTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { transactions, loading };
};

export default useRecentTransactions;
