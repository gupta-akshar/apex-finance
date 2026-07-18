import API from "./axios";

export const getTransactions = async (params = {}, { signal } = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined,
    ),
  );

  const res = await API.get("/transactions", { params: cleanParams, signal });
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
