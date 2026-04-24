import React, { useState, useEffect } from "react";
import {
  getCategories,
  addCategoryAPI,
  deleteCategoryAPI,
} from "../api/categoryApi";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [type, setType] = useState("expense");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const addCategory = async () => {
    if (!newCategory) return;

    try {
      const added = await addCategoryAPI({ name: newCategory, type });
      setCategories([...categories, added]);
      setNewCategory("");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await deleteCategoryAPI(id);
      setCategories(categories.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return <p className="p-6 text-secondaryText">Loading categories...</p>;

  return (
    <div className="min-h-screen bg-background text-primaryText p-6">
      <h1 className="text-3xl font-bold mb-8">Categories</h1>

      <div className="max-w-md mb-8 flex gap-3">
        <input
          type="text"
          placeholder="New category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="flex-1 bg-inputBg border border-border rounded-lg px-3 py-2 text-primaryText placeholder:text-secondaryText transition-all duration-300 focus:ring-2 focus:ring-accent focus:border-accent"
        />
        <button
          onClick={addCategory}
          className="bg-accent hover:bg-accentHover px-4 py-2 rounded-lg text-white transition transform hover:scale-105"
        >
          Add
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-secondaryText">No categories yet.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="bg-card border border-border rounded-xl p-4 flex justify-between items-center hover:bg-[#1f1f23] transition-all duration-300 cursor-pointer"
            >
              <p className="font-medium">{cat.name}</p>
              <button
                onClick={() => deleteCategory(cat._id)}
                className="text-red-400 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Categories;
