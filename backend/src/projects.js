import { Router } from 'express';
import { pool } from './db.js';
import { toCamelProject, toCamelQuote } from './transforms.js';
import { validateBody, projectCreateSchema, projectUpdateSchema } from './validation.js';
import { parsePagination, buildListResponse } from './pagination.js';
import { asyncHandler } from './error-handler.js';
import {
  centsToEuros,
  eurosToCents,
  addVatCents,
  computeDiscountCents,
} from './money.js';

export const projectsRouter = Router();

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    if (wantsPagination) {
      const { page, limit, offset } = parsePagination(req.query);
      const [countResult, rowsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM projects'),
        pool.query(
          `SELECT p.*, c.name as customer_name
           FROM projects p
           LEFT JOIN customers c ON p.customer_id = c.id
           ORDER BY p.created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
      ]);
      const total = parseInt(countResult.rows[0].count);
      res.json(buildListResponse(rowsResult.rows.map(toCamelProject), total, page, limit));
      return;
    }

    const result = await pool.query(`
      SELECT p.*, c.name as customer_name
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows.map(toCamelProject));
  }),
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, c.name as customer_name
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(toCamelProject(result.rows[0]));
  }),
);

projectsRouter.post(
  '/',
  validateBody(projectCreateSchema),
  asyncHandler(async (req, res) => {
    const { name, customerId, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO projects (name, customer_id, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, customerId || null, description || null, status],
    );
    res.status(201).json(toCamelProject(result.rows[0]));
  }),
);

projectsRouter.put(
  '/:id',
  validateBody(projectUpdateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, customerId, description, status } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (customerId !== undefined) { sets.push(`customer_id = $${idx++}`); vals.push(customerId); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }

    if (sets.length === 0) {
      const error = new Error('No fields to update');
      error.status = 400;
      throw error;
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(toCamelProject(result.rows[0]));
  }),
);

projectsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  }),
);

projectsRouter.get(
  '/:id/quotes',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT q.*,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
             c.country as customer_country, c.notes as customer_notes,
             c.created_at as customer_created_at, c.updated_at as customer_updated_at
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.project_id = $1
      ORDER BY q.created_at DESC
    `, [id]);
    res.json(result.rows.map((row) => toCamelQuote(row)));
  }),
);

projectsRouter.get(
  '/:id/finances',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const DEFAULT_VAT_RATE = 0.19;
    const [quotesResult, invoicesResult] = await Promise.all([
      pool.query(`
        SELECT q.id, q.discount_type, q.discount_value,
               COALESCE(SUM(qi.quantity * qi.unit_price), 0) AS subtotal
        FROM quotes q
        LEFT JOIN quote_items qi ON q.id = qi.quote_id
        WHERE q.project_id = $1
        GROUP BY q.id, q.discount_type, q.discount_value
      `, [id]),
      pool.query(`
        SELECT COALESCE(SUM(total_gross), 0) AS total
        FROM invoices
        WHERE project_id = $1 AND status != 'cancelled'
      `, [id]),
    ]);

    let quotesTotalGrossCents = 0;
    for (const row of quotesResult.rows) {
      const subtotalCents = eurosToCents(row.subtotal) ?? 0;
      const discountCents = computeDiscountCents(
        subtotalCents,
        row.discount_type,
        row.discount_value,
      );
      const totalNetCents = Math.max(0, subtotalCents - discountCents);
      const totalGrossCents = addVatCents(totalNetCents, DEFAULT_VAT_RATE);
      quotesTotalGrossCents += totalGrossCents;
    }

    const quotesTotalGross = centsToEuros(quotesTotalGrossCents);
    const invoicesTotalGross = parseFloat(invoicesResult.rows[0].total ?? 0);

    res.json({
      quotesTotalGross,
      invoicesTotalGross,
      openAmount: Math.max(0, quotesTotalGross - invoicesTotalGross),
      quoteCount: quotesResult.rows.length,
    });
  }),
);
