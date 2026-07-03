import { useContext } from "react";
import CategoryContext from "../context/CategoryContext";

const useCategories = () => {
  const { categories, loading, error } = useContext(CategoryContext);
  return { categories, loading, error };
};

export const clearCategoryCache = () => {};

export default useCategories;
