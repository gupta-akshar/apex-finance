import API from "./axios";

export const getAnalytics = async () => {
  const res = await API.get("/analytics");
  return res.data;
};

export const getAnalyticsByDateRange = async (startDate, endDate) => {
  const res = await API.get("/analytics", {
    params: { startDate, endDate },
  });
  return res.data;
};

export const getCategoryBreakdown = async () => {
  const res = await API.get("/analytics/categories");
  return res.data;
};
