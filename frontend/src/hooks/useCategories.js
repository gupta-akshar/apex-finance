import { useContext } from "react";
import CategoryContext from "../context/CategoryContext";

let _invalidateRef = null;

export const registerCategoryInvalidate = (fn) => {
  _invalidateRef = fn;
};
export const unregisterCategoryInvalidate = () => {
  _invalidateRef = null;
};

export const clearCategoryCache = () => {
  if (_invalidateRef) _invalidateRef();
};

const useCategories = () => {
  const context = useContext(CategoryContext);

  if (context === null) {
    throw new Error(
      "useCategories must be used inside <CategoryProvider>. " +
        "Make sure the component is rendered within the authenticated route layout.",
    );
  }

  return context;
};

export default useCategories;
