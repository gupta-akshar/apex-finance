import Category from "../models/Category.js";

// GET all categories — scoped to the authenticated user
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADD category — user is injected from the auth token, never from the body
export const addCategory = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    const category = await Category.create({
      name,
      type,
      user: req.user._id, // always from verified JWT, not req.body
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE category — ownership enforced: only the owning user can delete
export const deleteCategory = async (req, res) => {
  try {
    // SECURITY FIX: was Category.findByIdAndDelete(req.params.id)
    // That allowed any authenticated user to delete any category by id.
    // Now we scope the query to { _id, user } so the delete only succeeds
    // when the document belongs to the requesting user.
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!category) {
      // Returns 404 whether the document doesn't exist OR belongs to another
      // user — deliberately indistinguishable to prevent resource enumeration.
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
