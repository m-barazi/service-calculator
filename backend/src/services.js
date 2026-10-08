import { Router } from 'express';
import { pool } from './db.js';
import { toCamel } from './transforms.js';
import { validateBody, serviceCreateSchema, serviceUpdateSchema } from './validation.js';
import { parsePagination, buildListResponse } from './pagination.js';

export const servicesRouter = Router();

function buildServiceFilters(query) {
  const where = [];
  const params = [];
  let idx = 1;

  if (query.search) {
    const q = `%${query.search}%`;
    where.push(`(s.name ILIKE $${idx} OR s.note ILIKE $${idx} OR c.name ILIKE $${idx})`);
    params.push(q);
    idx++;
  }
  if (query.categoryId) {
    where.push(`s.category_id = $${idx}`);
    params.push(query.categoryId);
    idx++;
  }
  if (query.visible !== undefined) {
    where.push(`s.visible = $${idx}`);
    params.push(query.visible === 'true');
    idx++;
  }

  return { whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '', params, idx };
}

servicesRouter.get('/', async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const { whereClause, params, idx } = buildServiceFilters(req.query);
    const orderBy = 'ORDER BY c.sort_order NULLS LAST, s.pinned DESC, s.name';

    if (wantsPagination) {
      const { page, limit, offset } = parsePagination(req.query);
      const [countResult, rowsResult] = await Promise.all([
        pool.query(`SELECT COUNT(s.*) FROM services s LEFT JOIN categories c ON s.category_id = c.id ${whereClause}`, params),
        pool.query(
          `SELECT s.* FROM services s LEFT JOIN categories c ON s.category_id = c.id ${whereClause} ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset],
        ),
      ]);
      const total = parseInt(countResult.rows[0].count);
      res.json(buildListResponse(rowsResult.rows.map(toCamel), total, page, limit));
      return;
    }

    const result = await pool.query(
      `SELECT s.* FROM services s LEFT JOIN categories c ON s.category_id = c.id ${whereClause} ${orderBy}`,
      params,
    );
    res.json(result.rows.map(toCamel));
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

servicesRouter.get('/stats', async (req, res) => {
  try {
    const [totalResult, visibleResult, categoryResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM services'),
      pool.query('SELECT COUNT(*) FROM services WHERE visible = true'),
      pool.query(`SELECT c.id AS category_id, COUNT(s.id) AS count
                  FROM categories c
                  LEFT JOIN services s ON c.id = s.category_id
                  GROUP BY c.id
                  ORDER BY c.sort_order, c.name`),
    ]);
    res.json({
      totalCount: parseInt(totalResult.rows[0].count),
      visibleCount: parseInt(visibleResult.rows[0].count),
      categoryCounts: categoryResult.rows.map((row) => ({
        categoryId: row.category_id,
        count: parseInt(row.count),
      })),
    });
  } catch (error) {
    console.error('Error fetching service stats:', error);
    res.status(500).json({ error: 'Failed to fetch service stats' });
  }
});

servicesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(toCamel(result.rows[0]));
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

servicesRouter.post('/', validateBody(serviceCreateSchema), async (req, res) => {
  try {
    const { name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible, pinned } = req.body;
    const result = await pool.query(
      `INSERT INTO services (name, category_id, purchase_price, sale_price, default_quantity, url, note, visible, pinned, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible ?? true, pinned ?? false],
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

servicesRouter.put('/:id', validateBody(serviceUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible, pinned } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (categoryId !== undefined) { sets.push(`category_id = $${idx++}`); vals.push(categoryId); }
    if (purchasePrice !== undefined) { sets.push(`purchase_price = $${idx++}`); vals.push(purchasePrice); }
    if (salePrice !== undefined) { sets.push(`sale_price = $${idx++}`); vals.push(salePrice); }
    if (defaultQuantity !== undefined) { sets.push(`default_quantity = $${idx++}`); vals.push(defaultQuantity); }
    if (url !== undefined) { sets.push(`url = $${idx++}`); vals.push(url); }
    if (note !== undefined) { sets.push(`note = $${idx++}`); vals.push(note); }
    if (visible !== undefined) { sets.push(`visible = $${idx++}`); vals.push(visible); }
    if (pinned !== undefined) { sets.push(`pinned = $${idx++}`); vals.push(pinned); }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE services SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(toCamel(result.rows[0]));
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

servicesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});
