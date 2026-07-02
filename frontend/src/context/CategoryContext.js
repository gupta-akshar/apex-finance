import { createContext } from "react";

const CategoryContext = createContext({
  categories: [],
  loading: false,
  error: null,
  invalidate: () => {},
});

export default CategoryContext;
