import { Router } from 'express';
import { pool } from './db.js';
import { generateInvoiceNumber } from './numbers.js';
import { computeQuoteTotalsForInvoice } from './quotes/totals.js';
import { toCamelInvoice, toCamelQuoteItem } from './transforms.js';
import { validateBody, invoiceUpdateSchema } from './validation.js';
import { parsePagination, buildListResponse } from './pagination.js';

export const invoicesRouter = Router();

invoicesRouter.get('/', async (req, res) => {
  try {
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    if (wantsPagination) {
      const { page, limit, offset } = parsePagination(req.query);
      const [countResult, rowsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM invoices'),
        pool.query(
          `SELECT i.*,
                  q.quote_number, q.title as quote_title, q.status as quote_status,
                  q.customer_id as quote_customer_id, q.customer_name as quote_customer_name,
                  q.project_id as quote_project_id,
                  c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
                  c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
                  c.country as customer_country, c.notes as customer_notes,
                  c.created_at as customer_created_at, c.updated_at as customer_updated_at,
                  p.name as project_name, p.status as project_status, p.customer_id as project_customer_id,
                  pc.name as project_customer_name
           FROM invoices i
           LEFT JOIN quotes q ON i.quote_id = q.id
           LEFT JOIN customers c ON i.customer_id = c.id
           LEFT JOIN projects p ON i.project_id = p.id
           LEFT JOIN customers pc ON p.customer_id = pc.id
           ORDER BY i.created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
      ]);
      const total = parseInt(countResult.rows[0].count);
      res.json(buildListResponse(rowsResult.rows.map(toCamelInvoice), total, page, limit));
      return;
    }

    const result = await pool.query(`
      SELECT i.*,
             q.quote_number, q.title as quote_title, q.status as quote_status,
             q.customer_id as quote_customer_id, q.customer_name as quote_customer_name,
             q.project_id as quote_project_id,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
             c.country as customer_country, c.notes as customer_notes,
             c.created_at as customer_created_at, c.updated_at as customer_updated_at,
             p.name as project_name, p.status as project_status, p.customer_id as project_customer_id,
             pc.name as project_customer_name
      FROM invoices i
      LEFT JOIN quotes q ON i.quote_id = q.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN customers pc ON p.customer_id = pc.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows.map(toCamelInvoice));
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

invoicesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceResult = await pool.query(`
      SELECT i.*,
             q.quote_number, q.title as quote_title, q.status as quote_status,
             q.customer_id as quote_customer_id, q.customer_name as quote_customer_name,
             q.project_id as quote_project_id,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
             c.country as customer_country, c.notes as customer_notes,
             c.created_at as customer_created_at, c.updated_at as customer_updated_at,
             p.name as project_name, p.status as project_status, p.customer_id as project_customer_id,
             pc.name as project_customer_name
      FROM invoices i
      LEFT JOIN quotes q ON i.quote_id = q.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN customers pc ON p.customer_id = pc.id
      WHERE i.id = $1
    `, [id]);
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoice = toCamelInvoice(invoiceResult.rows[0]);

    // Invoice items are an immutable snapshot, independent of later quote changes
    const itemsResult = await pool.query(`
      SELECT ii.*, s.name as service_name, s.purchase_price as service_purchase_price,
             s.sale_price as service_sale_price, s.category_id as service_category_id
      FROM invoice_items ii
      LEFT JOIN services s ON ii.service_id = s.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.sort_order, ii.created_at
    `, [id]);
    invoice.items = itemsResult.rows.map(toCamelQuoteItem);

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

invoicesRouter.put('/:id', validateBody(invoiceUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, dueDate, paidAt, notes } = req.body;
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

    const sets = [];
    const vals = [];
    let idx = 1;

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      sets.push(`status = $${idx++}`);
      vals.push(status);
      if (status === 'paid' && paidAt === undefined) {
        sets.push(`paid_at = $${idx++}`);
        vals.push(new Date().toISOString());
      }
    }
    if (dueDate !== undefined) { sets.push(`due_date = $${idx++}`); vals.push(dueDate || null); }
    if (paidAt !== undefined) { sets.push(`paid_at = $${idx++}`); vals.push(paidAt || null); }
    if (notes !== undefined) { sets.push(`notes = $${idx++}`); vals.push(notes || null); }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE invoices SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals,
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(toCamelInvoice(result.rows[0]));
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

invoicesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Invoice creation from a quote is logically grouped under quotes in the URL,
// but implemented here so the invoices module owns the invoice lifecycle.
invoicesRouter.post('/from-quote/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const vatRate = parseFloat(req.body.vatRate) || 0.19;

    await client.query('BEGIN');

    const quoteResult = await client.query(`
      SELECT q.*, c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
      FOR UPDATE
    `, [id]);
    if (quoteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quote not found' });
    }
    const quote = quoteResult.rows[0];
    if (quote.status !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invoice can only be created from accepted quotes' });
    }

    const existing = await client.query('SELECT id FROM invoices WHERE quote_id = $1 LIMIT 1', [id]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Invoice already exists for this quote' });
    }

    const totals = await computeQuoteTotalsForInvoice(id, vatRate);
    if (!totals) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to compute invoice totals' });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const title = `Rechnung zu ${quote.title}`;
    const invoiceResult = await client.query(
      `INSERT INTO invoices (invoice_number, quote_id, project_id, customer_id, customer_name, title, status, total_net, total_gross, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [invoiceNumber, id, quote.project_id, quote.customer_id, quote.customer_name, title, 'draft', totals.totalNet, totals.totalGross, quote.notes || null],
    );
    const invoice = invoiceResult.rows[0];

    // Snapshot quote items into invoice_items so later quote edits cannot alter the invoice
    await client.query(`
      INSERT INTO invoice_items (invoice_id, service_id, custom_name, custom_note, quantity, unit_price, purchase_price, sort_order, created_at, updated_at)
      SELECT $1, qi.service_id, qi.custom_name, qi.custom_note, qi.quantity, qi.unit_price, qi.purchase_price, qi.sort_order, qi.created_at, qi.updated_at
      FROM quote_items qi
      WHERE qi.quote_id = $2
      ORDER BY qi.sort_order, qi.created_at
    `, [invoice.id, id]);

    await client.query('COMMIT');

    const itemsResult = await pool.query(`
      SELECT ii.*, s.name as service_name, s.purchase_price as service_purchase_price,
             s.sale_price as service_sale_price, s.category_id as service_category_id
      FROM invoice_items ii
      LEFT JOIN services s ON ii.service_id = s.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.sort_order, ii.created_at
    `, [invoice.id]);

    const fullInvoice = toCamelInvoice(invoice);
    fullInvoice.items = itemsResult.rows.map(toCamelQuoteItem);
    res.status(201).json(fullInvoice);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
});
