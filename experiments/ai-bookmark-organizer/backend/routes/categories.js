const express = require('express');
const router = express.Router();
const CategoryService = require('../services/categoryService');

const categoryService = new CategoryService();

/**
 * GET /api/categories - Get all categories
 */
router.get('/', async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/categories/tree - Get category hierarchy
 */
router.get('/tree', async (req, res) => {
  try {
    const tree = await categoryService.getCategoryTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error fetching category tree:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/categories/:id - Get category by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/categories - Create new category
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, parent_id, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const category = await categoryService.createCategory({
      name,
      description,
      parent_id,
      color,
      icon
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/categories/:id - Update category
 */
router.put('/:id', async (req, res) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/categories/:id - Delete category
 */
router.delete('/:id', async (req, res) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: 'Category deleted, bookmarks moved to Uncategorized' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/categories/:id/merge - Merge categories
 */
router.post('/:id/merge', async (req, res) => {
  try {
    const { targetId } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Target category ID is required' });
    }

    const category = await categoryService.mergeCategories(req.params.id, targetId);
    res.json({ success: true, data: category, message: 'Categories merged successfully' });
  } catch (error) {
    console.error('Error merging categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
