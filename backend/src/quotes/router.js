import { Router } from 'express';
import { pool } from '../db.js';
import { generateQuoteNumber } from '../numbers.js';
import { toCamelQuote, toCamelQuoteItem } from '../transforms.js';
import { quoteItemsRouter } from './items.js';
import {
  validateBody,
  quoteCreateSchema,
  quoteWithItemsSchema,
  quoteUpdateSchema,
  quoteStatusSchema,
} from '../validation.js';
import { parsePagination, buildListResponse } from '../pagination.js';
import { asyncHandler } from '../error-handler.js';
import {
  eurosToCents,
  centsToEuros,
  addVatCents,
  computeDiscountCents,
} from '../money.js';

export const quotesRouter = Router();
quotesRouter.use('/:id/items', quoteItemsRouter);

const DEFAULT_VAT_RATE = 0.19;

function toCamelQuoteWithTotals(row) {
  const quote = toCamelQuote(row);
  if (row.subtotal_net === undefined) return quote;
  const subtotalCents = eurosToCents(Number(row.subtotal_net ?? 0)) ?? 0;
  const discountCents = computeDiscountCents(subtotalCents, row.discount_type, Number(row.discount_value ?? 0));
  const totalNetCents = Math.max(0, subtotalCents - discountCents);
  const totalGrossCents = addVatCents(totalNetCents, DEFAULT_VAT_RATE);
  quote.totalNet = centsToEuros(totalNetCents);
  quote.totalGross = centsToEuros(totalGrossCents);
  return quote;
}

const quoteListQuery = `
  SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
         c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
         c.country as customer_country, c.notes as customer_notes,
         c.created_at as customer_created_at, c.updated_at as customer_updated_at,
         COALESCE(sub.subtotal, 0) as subtotal_net
  FROM quotes q
  LEFT JOIN customers c ON q.customer_id = c.id
  LEFT JOIN (
    SELECT quote_id, SUM(quantity * unit_price) as subtotal
    FROM quote_items
    GROUP BY quote_id
  ) sub ON sub.quote_id = q.id
`;

quotesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    if (wantsPagination) {
      const { page, limit, offset } = parsePagination(req.query);
      const [countResult, rowsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM quotes'),
        pool.query(
          `${quoteListQuery} ORDER BY q.created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
      ]);
      const total = parseInt(countResult.rows[0].count);
      res.json(buildListResponse(rowsResult.rows.map((row) => toCamelQuoteWithTotals(row)), total, page, limit));
      return;
    }

    const result = await pool.query(`${quoteListQuery} ORDER BY q.created_at DESC`);
    res.json(result.rows.map((row) => toCamelQuoteWithTotals(row)));
  }),
);

quotesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const quoteResult = await pool.query(
      `${quoteListQuery} WHERE q.id = $1`,
      [id],
    );
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    const itemsResult = await pool.query(
      `SELECT qi.*, s.name as service_name, s.purchase_price as service_purchase_price,
              s.sale_price as service_sale_price, s.category_id as service_category_id
       FROM quote_items qi
       LEFT JOIN services s ON qi.service_id = s.id
       WHERE qi.quote_id = $1
       ORDER BY qi.sort_order, qi.created_at`,
      [id],
    );
    const quote = toCamelQuote(quoteResult.rows[0]);
    quote.items = itemsResult.rows.map(toCamelQuoteItem);
    res.json(quote);
  }),
);

quotesRouter.post(
  '/',
  validateBody(quoteCreateSchema),
  asyncHandler(async (req, res) => {
    const { title, customerId, customerName, projectId, status, discountType, discountValue, notes, validUntil } = req.body;
    const quoteNumber = await generateQuoteNumber();
    const result = await pool.query(
      `INSERT INTO quotes (quote_number, title, customer_id, customer_name, project_id, status, discount_type, discount_value, notes, valid_until, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [quoteNumber, title, customerId || null, customerName || null, projectId || null, status || 'draft', discountType || null, discountValue ?? 0, notes || null, validUntil || null],
    );
    res.status(201).json(toCamelQuote(result.rows[0]));
  }),
);

// Create a quote together with its items in a single atomic transaction.
quotesRouter.post(
  '/with-items',
  validateBody(quoteWithItemsSchema),
  asyncHandler(async (req, res) => {
    const { title, customerId, customerName, projectId, status, discountType, discountValue, notes, validUntil, items } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quoteNumber = await generateQuoteNumber();
      const quoteResult = await client.query(
        `INSERT INTO quotes (quote_number, title, customer_id, customer_name, project_id, status, discount_type, discount_value, notes, valid_until, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [quoteNumber, title, customerId || null, customerName || null, projectId || null, status || 'draft', discountType || null, discountValue ?? 0, notes || null, validUntil || null],
      );
      const quote = quoteResult.rows[0];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let effectivePurchasePrice = item.purchasePrice ?? null;
        if (effectivePurchasePrice == null && item.serviceId) {
          const serviceResult = await client.query('SELECT purchase_price FROM services WHERE id = $1', [item.serviceId]);
          if (serviceResult.rows.length > 0) {
            effectivePurchasePrice = serviceResult.rows[0].purchase_price;
          }
        }
        await client.query(
          `INSERT INTO quote_items (quote_id, service_id, custom_name, custom_note, quantity, unit_price, purchase_price, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [quote.id, item.serviceId || null, item.customName || null, item.customNote || null, item.quantity ?? 1, item.unitPrice ?? 0, effectivePurchasePrice, item.sortOrder ?? i],
        );
      }

      await client.query('COMMIT');

      const itemsResult = await pool.query(
        `SELECT qi.*, s.name as service_name, s.purchase_price as service_purchase_price,
                s.sale_price as service_sale_price, s.category_id as service_category_id
         FROM quote_items qi
         LEFT JOIN services s ON qi.service_id = s.id
         WHERE qi.quote_id = $1
         ORDER BY qi.sort_order, qi.created_at`,
        [quote.id],
      );

      const fullQuote = toCamelQuote(quote);
      fullQuote.items = itemsResult.rows.map(toCamelQuoteItem);
      res.status(201).json(fullQuote);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

quotesRouter.put(
  '/:id',
  validateBody(quoteUpdateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, customerId, customerName, projectId, status, discountType, discountValue, notes, validUntil } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (title !== undefined) { sets.push(`title = $${idx++}`); vals.push(title); }
    if (customerId !== undefined) { sets.push(`customer_id = $${idx++}`); vals.push(customerId); }
    if (customerName !== undefined) { sets.push(`customer_name = $${idx++}`); vals.push(customerName); }
    if (projectId !== undefined) { sets.push(`project_id = $${idx++}`); vals.push(projectId); }
    if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }
    if (discountType !== undefined) { sets.push(`discount_type = $${idx++}`); vals.push(discountType); }
    if (discountValue !== undefined) { sets.push(`discount_value = $${idx++}`); vals.push(discountValue); }
    if (notes !== undefined) { sets.push(`notes = $${idx++}`); vals.push(notes); }
    if (validUntil !== undefined) { sets.push(`valid_until = $${idx++}`); vals.push(validUntil); }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE quotes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(toCamelQuote(result.rows[0]));
  }),
);

quotesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM quotes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.status(204).send();
  }),
);

quotesRouter.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM quote_status_history WHERE quote_id = $1 ORDER BY created_at DESC',
      [id],
    );
    res.json(result.rows.map((row) => ({
      id: row.id,
      quoteId: row.quote_id,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      changedBy: row.changed_by,
      createdAt: row.created_at,
    })));
  }),
);

quotesRouter.post(
  '/:id/status',
  validateBody(quoteStatusSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, changedBy } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quoteResult = await client.query('SELECT status FROM quotes WHERE id = $1 FOR UPDATE', [id]);
      if (quoteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        const error = new Error('Quote not found');
        error.status = 404;
        throw error;
      }
      const oldStatus = quoteResult.rows[0].status;
      if (oldStatus === status) {
        await client.query('ROLLBACK');
        const error = new Error('New status must differ from current status');
        error.status = 400;
        throw error;
      }

      const updateResult = await client.query(
        'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id],
      );
      await client.query(
        `INSERT INTO quote_status_history (quote_id, old_status, new_status, changed_by, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, oldStatus, status, changedBy || null],
      );
      await client.query('COMMIT');
      res.json(toCamelQuote(updateResult.rows[0]));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

quotesRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const quoteResult = await pool.query('SELECT * FROM quotes WHERE id = $1', [id]);
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    const original = quoteResult.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quoteNumber = await generateQuoteNumber();
      const newQuoteResult = await client.query(
        `INSERT INTO quotes (quote_number, title, customer_id, customer_name, project_id, status, discount_type, discount_value, notes, valid_until, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [
          quoteNumber,
          `${original.title} (Kopie)`,
          original.customer_id,
          original.customer_name,
          original.project_id,
          'draft',
          original.discount_type,
          original.discount_value,
          original.notes,
          original.valid_until,
        ],
      );
      const newQuote = newQuoteResult.rows[0];

      const itemsResult = await client.query('SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY sort_order, created_at', [id]);
      for (let i = 0; i < itemsResult.rows.length; i++) {
        const item = itemsResult.rows[i];
        await client.query(
          `INSERT INTO quote_items (quote_id, service_id, custom_name, custom_note, quantity, unit_price, purchase_price, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            newQuote.id,
            item.service_id,
            item.custom_name,
            item.custom_note,
            item.quantity,
            item.unit_price,
            item.purchase_price ?? null,
            item.sort_order,
          ],
        );
      }

      await client.query('COMMIT');

      const detailResult = await pool.query(
        `SELECT qi.*, s.name as service_name, s.purchase_price as service_purchase_price,
                s.sale_price as service_sale_price, s.category_id as service_category_id
         FROM quote_items qi
         LEFT JOIN services s ON qi.service_id = s.id
         WHERE qi.quote_id = $1
         ORDER BY qi.sort_order, qi.created_at`,
        [newQuote.id],
      );

      const quote = toCamelQuote(newQuote);
      quote.items = detailResult.rows.map(toCamelQuoteItem);
      res.status(201).json(quote);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);
