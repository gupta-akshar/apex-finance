import API from "./axios";

/**
 * Fetch paginated + filtered transactions.
 *
 * @param {Object} params
 * @param {number}  params.page
 * @param {number}  params.limit
 * @param {string}  params.type        - "income" | "expense" | ""
 * @param {string}  params.category    - category ObjectId string | ""
 * @param {string}  params.startDate   - "YYYY-MM-DD" | ""
 * @param {string}  params.endDate     - "YYYY-MM-DD" | ""
 * @param {string}  params.month       - "1"-"12" | ""
 * @param {string}  params.year        - "2024" | ""
 * @param {string}  params.search      - free-text | ""
 * @param {string}  params.sort        - "latest"|"oldest"|"highest"|"lowest"
 *
 * @returns {{ transactions: [], pagination: { total, page, pages, limit } }}
 */
export const getTransactions = async (params = {}) => {
  // Strip empty / undefined values so the URL stays clean
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined,
    ),
  );

  const res = await API.get("/transactions", { params: cleanParams });
  return res.data;
};

export const createTransaction = async (data) => {
  const res = await API.post("/transactions", data);
  return res.data;
};

export const updateTransaction = async (id, data) => {
  const res = await API.put(`/transactions/${id}`, data);
  return res.data;
};

export const deleteTransaction = async (id) => {
  const res = await API.delete(`/transactions/${id}`);
  return res.data;
};
