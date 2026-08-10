import { useContext } from "react";
import CategoryContext from "../context/CategoryContext";

export const clearCategoryCache = () => {};

const useCategories = () => {
  const context = useContext(CategoryContext);

  if (context === null) {
    return {
      categories: [],
      loading: false,
      error: null,
      invalidate: () => {},
    };
  }

  return context;
};

export default useCategories;
