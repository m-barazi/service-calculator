import { Router } from 'express';
import { pool } from './db.js';
import { toCamelCustomer } from './transforms.js';
import { validateBody, customerCreateSchema, customerUpdateSchema } from './validation.js';
import { parsePagination, buildListResponse } from './pagination.js';
import { asyncHandler } from './error-handler.js';

export const customersRouter = Router();

customersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    if (wantsPagination) {
      const { page, limit, offset } = parsePagination(req.query);
      const [countResult, rowsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM customers'),
        pool.query('SELECT * FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      ]);
      const total = parseInt(countResult.rows[0].count);
      res.json(buildListResponse(rowsResult.rows.map(toCamelCustomer), total, page, limit));
      return;
    }

    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows.map(toCamelCustomer));
  }),
);

customersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(toCamelCustomer(result.rows[0]));
  }),
);

customersRouter.post(
  '/',
  validateBody(customerCreateSchema),
  asyncHandler(async (req, res) => {
    const { name, email, phone, street, zip, city, country, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO customers (name, email, phone, street, zip, city, country, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [name, email || null, phone || null, street || null, zip || null, city || null, country || null, notes || null],
    );
    res.status(201).json(toCamelCustomer(result.rows[0]));
  }),
);

customersRouter.put(
  '/:id',
  validateBody(customerUpdateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, street, zip, city, country, notes } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (email !== undefined) { sets.push(`email = $${idx++}`); vals.push(email); }
    if (phone !== undefined) { sets.push(`phone = $${idx++}`); vals.push(phone); }
    if (street !== undefined) { sets.push(`street = $${idx++}`); vals.push(street); }
    if (zip !== undefined) { sets.push(`zip = $${idx++}`); vals.push(zip); }
    if (city !== undefined) { sets.push(`city = $${idx++}`); vals.push(city); }
    if (country !== undefined) { sets.push(`country = $${idx++}`); vals.push(country); }
    if (notes !== undefined) { sets.push(`notes = $${idx++}`); vals.push(notes); }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE customers SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(toCamelCustomer(result.rows[0]));
  }),
);

customersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const refCheck = await pool.query('SELECT COUNT(*) FROM quotes WHERE customer_id = $1', [id]);
    const quoteCount = parseInt(refCheck.rows[0].count);
    if (quoteCount > 0) {
      return res.status(409).json({ error: 'Customer has associated quotes', quoteCount });
    }
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(204).send();
  }),
);
