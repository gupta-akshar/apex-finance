// src/api/categoryApi.js
import API from "./axios"; // your axios instance

// Fetch all categories
export const getCategories = async () => {
  const res = await API.get("/categories");
  return res.data;
};

// Add a new category
export const addCategoryAPI = async (name) => {
  const res = await API.post("/categories", { name });
  return res.data;
};

// Delete a category by ID
export const deleteCategoryAPI = async (id) => {
  const res = await API.delete(`/categories/${id}`);
  return res.data;
};
