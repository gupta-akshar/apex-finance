import API from "./axios";

export const getAnalytics = async () => {
  const res = await API.get("/analytics");
  return res.data;
};
