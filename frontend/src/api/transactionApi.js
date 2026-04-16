import API from "./axios";

export const getTransactions = async () => {
  const res = await API.get("/transactions");
  return res.data;
};

export const createTransaction = async (data) => {
  const res = await API.post("/transactions", data);
  return res.data;
};

export const deleteTransaction = async (id) => {
  const res = await API.delete(`/transactions/${id}`);
  return res.data;
};
