const db = require('../config/database');

class CategoryService {
  /**
   * Get all categories with bookmark counts
   */
  async getAllCategories() {
    const result = await db.query(`
      SELECT c.*, COUNT(b.id) as bookmark_count
      FROM categories c
      LEFT JOIN bookmarks b ON c.id = b.category_id AND b.is_archived = false
      GROUP BY c.id
      ORDER BY c.name
    `);
    return result.rows;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id) {
    const result = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0];
  }

  /**
   * Create new category
   */
  async createCategory(categoryData) {
    const { name, description, parent_id, color, icon } = categoryData;

    const result = await db.query(
      `INSERT INTO categories (name, description, parent_id, color, icon, is_auto_generated)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [name, description || null, parent_id || null, color || null, icon || null]
    );

    return result.rows[0];
  }

  /**
   * Update category
   */
  async updateCategory(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'description', 'parent_id', 'color', 'icon'];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete category (moves bookmarks to Uncategorized)
   */
  async deleteCategory(id) {
    // Get or create "Uncategorized" category
    const uncategorized = await db.query(
      `INSERT INTO categories (name, description, is_auto_generated)
       VALUES ('Uncategorized', 'Default category', false)
       ON CONFLICT (name, parent_id) DO UPDATE SET name = 'Uncategorized'
       RETURNING id`
    );
    const uncategorizedId = uncategorized.rows[0].id;

    // Move bookmarks to uncategorized
    await db.query(
      'UPDATE bookmarks SET category_id = $1 WHERE category_id = $2',
      [uncategorizedId, id]
    );

    // Delete category
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
  }

  /**
   * Merge categories
   */
  async mergeCategories(sourceId, targetId) {
    // Move all bookmarks from source to target
    await db.query(
      'UPDATE bookmarks SET category_id = $1 WHERE category_id = $2',
      [targetId, sourceId]
    );

    // Delete source category
    await db.query('DELETE FROM categories WHERE id = $1', [sourceId]);

    return await this.getCategoryById(targetId);
  }

  /**
   * Get category hierarchy (tree structure)
   */
  async getCategoryTree() {
    const result = await db.query(`
      WITH RECURSIVE category_tree AS (
        SELECT id, name, parent_id, 0 as level, ARRAY[id] as path
        FROM categories
        WHERE parent_id IS NULL

        UNION ALL

        SELECT c.id, c.name, c.parent_id, ct.level + 1, ct.path || c.id
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT ct.*, COUNT(b.id) as bookmark_count
      FROM category_tree ct
      LEFT JOIN bookmarks b ON ct.id = b.category_id AND b.is_archived = false
      GROUP BY ct.id, ct.name, ct.parent_id, ct.level, ct.path
      ORDER BY ct.path
    `);

    return this.buildTree(result.rows);
  }

  /**
   * Build tree structure from flat list
   */
  buildTree(flatList) {
    const map = {};
    const roots = [];

    // Create map
    flatList.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });

    // Build tree
    flatList.forEach(item => {
      if (item.parent_id === null) {
        roots.push(map[item.id]);
      } else if (map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      }
    });

    return roots;
  }
}

module.exports = CategoryService;
