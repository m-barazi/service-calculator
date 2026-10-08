import { Router } from 'express';
import { pool } from './db.js';
import { toCamelCategory } from './transforms.js';
import {
  validateBody,
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryReorderSchema,
} from './validation.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json(result.rows.map(toCamelCategory));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

categoriesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(toCamelCategory(result.rows[0]));
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

categoriesRouter.post('/', validateBody(categoryCreateSchema), async (req, res) => {
  try {
    const { name, description, icon, color, sortOrder, visible } = req.body;
    const result = await pool.query(
      `INSERT INTO categories (name, description, icon, color, sort_order, visible, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [name, description || null, icon || null, color || null, sortOrder ?? 0, visible ?? true],
    );
    res.status(201).json(toCamelCategory(result.rows[0]));
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

categoriesRouter.put('/:id', validateBody(categoryUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, sortOrder, visible } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
    if (icon !== undefined) { sets.push(`icon = $${idx++}`); vals.push(icon); }
    if (color !== undefined) { sets.push(`color = $${idx++}`); vals.push(color); }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(sortOrder); }
    if (visible !== undefined) { sets.push(`visible = $${idx++}`); vals.push(visible); }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE categories SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(toCamelCategory(result.rows[0]));
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

categoriesRouter.post('/reorder', validateBody(categoryReorderSchema), async (req, res) => {
  try {
    const { ids } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ids.length; i++) {
        await client.query(
          'UPDATE categories SET sort_order = $1, updated_at = NOW() WHERE id = $2',
          [i, ids[i]],
        );
      }
      await client.query('COMMIT');
      const result = await client.query('SELECT * FROM categories ORDER BY sort_order, name');
      res.json(result.rows.map(toCamelCategory));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

categoriesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const refCheck = await pool.query('SELECT COUNT(*) FROM services WHERE category_id = $1', [id]);
    const serviceCount = parseInt(refCheck.rows[0].count);
    if (serviceCount > 0) {
      return res.status(409).json({ error: 'Category has associated services', serviceCount });
    }
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});
