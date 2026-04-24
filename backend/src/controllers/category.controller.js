import Category from "../models/Category.js";

// GET all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user.id });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD category
export const addCategory = async (req, res) => {
  try {
    const { name, type } = req.body;

    const category = await Category.create({
      name,
      type,
      user: req.user.id,
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE category
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
