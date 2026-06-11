import API from "./axios";

// Fetch all categories
export const getCategories = async ({ signal } = {}) => {
  const res = await API.get("/categories", { signal });
  return res.data;
};

// Add a new category
export const addCategoryAPI = async ({ name, type }) => {
  const res = await API.post("/categories", { name, type });
  return res.data;
};

// Delete category
export const deleteCategoryAPI = async (id) => {
  const res = await API.delete(`/categories/${id}`);
  return res.data;
};
