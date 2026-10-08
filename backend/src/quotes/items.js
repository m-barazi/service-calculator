import { Router } from 'express';
import { pool } from '../db.js';
import { toCamelQuoteItem } from '../transforms.js';
import {
  validateBody,
  quoteItemCreateSchema,
  quoteItemUpdateSchema,
} from '../validation.js';
import { asyncHandler } from '../error-handler.js';

export const quoteItemsRouter = Router({ mergeParams: true });

quoteItemsRouter.post(
  '/',
  validateBody(quoteItemCreateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { serviceId, customName, customNote, quantity, unitPrice, purchasePrice, sortOrder } = req.body;

    const quoteCheck = await pool.query('SELECT id FROM quotes WHERE id = $1', [id]);
    if (quoteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    let effectivePurchasePrice = purchasePrice ?? null;
    if (effectivePurchasePrice == null && serviceId) {
      const serviceResult = await pool.query('SELECT purchase_price FROM services WHERE id = $1', [serviceId]);
      if (serviceResult.rows.length > 0) {
        effectivePurchasePrice = serviceResult.rows[0].purchase_price;
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO quote_items (quote_id, service_id, custom_name, custom_note, quantity, unit_price, purchase_price, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id`,
      [id, serviceId || null, customName || null, customNote || null, quantity ?? 1, unitPrice ?? 0, effectivePurchasePrice, sortOrder ?? 0],
    );

    const itemResult = await pool.query(
      `SELECT qi.*, s.name as service_name, s.purchase_price as service_purchase_price,
              s.sale_price as service_sale_price, s.category_id as service_category_id
       FROM quote_items qi
       LEFT JOIN services s ON qi.service_id = s.id
       WHERE qi.id = $1`,
      [insertResult.rows[0].id],
    );
    res.status(201).json(toCamelQuoteItem(itemResult.rows[0]));
  }),
);

quoteItemsRouter.put(
  '/:itemId',
  validateBody(quoteItemUpdateSchema),
  asyncHandler(async (req, res) => {
    const { id, itemId } = req.params;
    const { serviceId, customName, customNote, quantity, unitPrice, purchasePrice, sortOrder } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (serviceId !== undefined) { sets.push(`service_id = $${idx++}`); vals.push(serviceId); }
    if (customName !== undefined) { sets.push(`custom_name = $${idx++}`); vals.push(customName); }
    if (customNote !== undefined) { sets.push(`custom_note = $${idx++}`); vals.push(customNote); }
    if (quantity !== undefined) { sets.push(`quantity = $${idx++}`); vals.push(quantity); }
    if (unitPrice !== undefined) { sets.push(`unit_price = $${idx++}`); vals.push(unitPrice); }
    if (purchasePrice !== undefined) { sets.push(`purchase_price = $${idx++}`); vals.push(purchasePrice); }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(sortOrder); }

    sets.push(`updated_at = NOW()`);
    vals.push(itemId);
    vals.push(id);

    const result = await pool.query(
      `UPDATE quote_items SET ${sets.join(', ')} WHERE id = $${idx} AND quote_id = $${idx + 1} RETURNING *`,
      vals,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote item not found' });
    }
    res.json(toCamelQuoteItem(result.rows[0]));
  }),
);

quoteItemsRouter.delete(
  '/:itemId',
  asyncHandler(async (req, res) => {
    const { id, itemId } = req.params;
    const result = await pool.query('DELETE FROM quote_items WHERE id = $1 AND quote_id = $2 RETURNING *', [itemId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote item not found' });
    }
    res.status(204).send();
  }),
);

quoteItemsRouter.patch(
  '/reorder',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds)) {
      const error = new Error('itemIds must be an array');
      error.status = 400;
      throw error;
    }
    for (let i = 0; i < itemIds.length; i++) {
      await pool.query('UPDATE quote_items SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND quote_id = $3', [i, itemIds[i], id]);
    }
    res.json({ success: true });
  }),
);
