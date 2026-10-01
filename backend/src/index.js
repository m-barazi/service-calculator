import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { buildDashboardData } from './dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'service_calculator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

app.use(cors());
app.use(express.json());

function toCamel(row) {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    purchasePrice: parseFloat(row.purchase_price),
    salePrice: parseFloat(row.sale_price),
    defaultQuantity: row.default_quantity,
    url: row.url,
    note: row.note,
    visible: row.visible,
    pinned: row.pinned ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCamelCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    visible: row.visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCamelCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    street: row.street,
    zip: row.zip,
    city: row.city,
    country: row.country,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCamelProject(row) {
  return {
    id: row.id,
    name: row.name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCamelInvoice(row) {
  const invoice = {
    id: row.id,
    invoiceNumber: row.invoice_number,
    quoteId: row.quote_id,
    quoteNumber: row.quote_number,
    projectId: row.project_id,
    projectName: row.project_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    title: row.title,
    status: row.status,
    dueDate: row.due_date ? (row.due_date.toISOString ? row.due_date.toISOString().slice(0, 10) : String(row.due_date).slice(0, 10)) : null,
    paidAt: row.paid_at,
    notes: row.notes,
    totalNet: parseFloat(row.total_net ?? 0),
    totalGross: parseFloat(row.total_gross ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.quote_id && row.quote_number !== undefined) {
    invoice.quote = {
      id: row.quote_id,
      quoteNumber: row.quote_number,
      title: row.quote_title,
      status: row.quote_status,
      customerId: row.quote_customer_id,
      customerName: row.quote_customer_name,
      projectId: row.quote_project_id,
      projectName: row.quote_project_name,
    };
  }
  if (row.customer_id && row.customer_name !== undefined) {
    invoice.customer = toCamelCustomer(row);
  }
  if (row.project_id && row.project_name !== undefined) {
    invoice.project = {
      id: row.project_id,
      name: row.project_name,
      customerId: row.project_customer_id,
      customerName: row.project_customer_name,
      status: row.project_status,
    };
  }
  return invoice;
}

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY pinned DESC, category_id, name');
    res.json(result.rows.map(toCamel));
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.get('/api/services/:id', async (req, res) => {
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

app.post('/api/services', async (req, res) => {
  try {
    const { name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible, pinned } = req.body;
    const result = await pool.query(
      `INSERT INTO services (name, category_id, purchase_price, sale_price, default_quantity, url, note, visible, pinned, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible ?? true, pinned ?? false]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.put('/api/services/:id', async (req, res) => {
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
      vals
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

app.delete('/api/services/:id', async (req, res) => {
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

// ── Category CRUD ───────────────────────────────────────────────────────

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json(result.rows.map(toCamelCategory));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/categories/:id', async (req, res) => {
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

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, icon, color, sortOrder, visible } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      `INSERT INTO categories (name, description, icon, color, sort_order, visible, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [name, description || null, icon || null, color || null, sortOrder ?? 0, visible ?? true]
    );
    res.status(201).json(toCamelCategory(result.rows[0]));
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', async (req, res) => {
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
      vals
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

app.post('/api/categories/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ids.length; i++) {
        await client.query(
          'UPDATE categories SET sort_order = $1, updated_at = NOW() WHERE id = $2',
          [i, ids[i]]
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

// ── Customer CRUD ───────────────────────────────────────────────────────

app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY name');
    res.json(result.rows.map(toCamelCustomer));
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(toCamelCustomer(result.rows[0]));
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, phone, street, zip, city, country, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool.query(
      `INSERT INTO customers (name, email, phone, street, zip, city, country, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [name, email || null, phone || null, street || null, zip || null, city || null, country || null, notes || null]
    );
    res.status(201).json(toCamelCustomer(result.rows[0]));
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
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
      vals
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(toCamelCustomer(result.rows[0]));
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
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

// ── Project CRUD ────────────────────────────────────────────────────────

app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as customer_name
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows.map(toCamelProject));
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, customerId, description, status } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const validStatuses = ['active', 'completed', 'on_hold', 'cancelled'];
    const safeStatus = status && validStatuses.includes(status) ? status : 'active';
    const result = await pool.query(
      `INSERT INTO projects (name, customer_id, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, customerId || null, description || null, safeStatus]
    );
    res.status(201).json(toCamelProject(result.rows[0]));
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
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
      return res.status(400).json({ error: 'No fields to update' });
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(toCamelProject(result.rows[0]));
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

app.get('/api/projects/:id/quotes', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
              c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
              c.country as customer_country, c.notes as customer_notes,
              c.created_at as customer_created_at, c.updated_at as customer_updated_at
       FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.project_id = $1
       ORDER BY q.created_at DESC`,
      [id]
    );
    res.json(result.rows.map(toCamelQuote));
  } catch (error) {
    console.error('Error fetching project quotes:', error);
    res.status(500).json({ error: 'Failed to fetch project quotes' });
  }
});

// ── Quote CRUD ───────────────────────────────────────────────────────────

function toCamelQuote(row) {
  const quote = {
    id: row.id,
    quoteNumber: row.quote_number,
    title: row.title,
    customerName: row.customer_name,
    customerId: row.customer_id,
    projectId: row.project_id,
    projectName: row.project_name,
    status: row.status,
    discountType: row.discount_type,
    discountValue: parseFloat(row.discount_value ?? 0),
    notes: row.notes,
    validUntil: row.valid_until ? (row.valid_until.toISOString ? row.valid_until.toISOString().slice(0, 10) : String(row.valid_until).slice(0, 10)) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.customer_id && row.customer_name) {
    quote.customer = toCamelCustomer(row);
  }
  return quote;
}

function toCamelQuoteItem(row) {
  const item = {
    id: row.id,
    quoteId: row.quote_id,
    serviceId: row.service_id,
    customName: row.custom_name,
    customNote: row.custom_note,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.service_id && row.service_name) {
    item.service = toCamel(row);
  }
  return item;
}

app.get('/api/quotes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
             c.country as customer_country, c.notes as customer_notes,
             c.created_at as customer_created_at, c.updated_at as customer_updated_at
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      ORDER BY q.created_at DESC
    `);
    res.json(result.rows.map(toCamelQuote));
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quoteResult = await pool.query(
      `SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
              c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
              c.country as customer_country, c.notes as customer_notes,
              c.created_at as customer_created_at, c.updated_at as customer_updated_at
       FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1`,
      [id]
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
      [id]
    );
    const quote = toCamelQuote(quoteResult.rows[0]);
    quote.items = itemsResult.rows.map(toCamelQuoteItem);
    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const prefix = `AN-${year}-`;
  const result = await pool.query(
    `SELECT quote_number FROM quotes WHERE quote_number LIKE $1 ORDER BY quote_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let next = 1;
  if (result.rows.length > 0) {
    const last = result.rows[0].quote_number;
    const match = last.match(/-(\d+)$/);
    if (match) {
      next = parseInt(match[1], 10) + 1;
    }
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `RE-${year}-`;
  const result = await pool.query(
    `SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY invoice_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let next = 1;
  if (result.rows.length > 0) {
    const last = result.rows[0].invoice_number;
    const match = last.match(/-(\d+)$/);
    if (match) {
      next = parseInt(match[1], 10) + 1;
    }
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function computeQuoteTotalsForInvoice(quoteId, vatRate) {
  const result = await pool.query(
    `SELECT
      COALESCE(SUM(qi.quantity * qi.unit_price), 0) AS subtotal,
      q.discount_type,
      q.discount_value
    FROM quotes q
    LEFT JOIN quote_items qi ON q.id = qi.quote_id
    WHERE q.id = $1
    GROUP BY q.id, q.discount_type, q.discount_value`,
    [quoteId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const subtotal = parseFloat(row.subtotal);
  let discount = 0;
  if (row.discount_type === 'percent') {
    discount = subtotal * (parseFloat(row.discount_value) / 100);
  } else if (row.discount_type === 'amount') {
    discount = parseFloat(row.discount_value);
  }
  const totalNet = Math.max(0, subtotal - discount);
  const totalGross = totalNet * (1 + vatRate);
  return { totalNet, totalGross };
}

app.post('/api/quotes', async (req, res) => {
  try {
    const { title, customerId, customerName, projectId, status, discountType, discountValue, notes, validUntil } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const quoteNumber = await generateQuoteNumber();
    const result = await pool.query(
      `INSERT INTO quotes (quote_number, title, customer_id, customer_name, project_id, status, discount_type, discount_value, notes, valid_until, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [quoteNumber, title, customerId || null, customerName || null, projectId || null, status || 'draft', discountType || null, discountValue ?? 0, notes || null, validUntil || null]
    );
    res.status(201).json(toCamelQuote(result.rows[0]));
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  try {
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
      vals
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(toCamelQuote(result.rows[0]));
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM quotes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// Quote status history
app.get('/api/quotes/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM quote_status_history WHERE quote_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      quoteId: row.quote_id,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      changedBy: row.changed_by,
      createdAt: row.created_at,
    })));
  } catch (error) {
    console.error('Error fetching quote status history:', error);
    res.status(500).json({ error: 'Failed to fetch quote status history' });
  }
});

app.post('/api/quotes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, changedBy } = req.body;
    const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const quoteResult = await client.query('SELECT status FROM quotes WHERE id = $1 FOR UPDATE', [id]);
      if (quoteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Quote not found' });
      }
      const oldStatus = quoteResult.rows[0].status;
      if (oldStatus === status) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'New status must differ from current status' });
      }

      const updateResult = await client.query(
        'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );
      await client.query(
        `INSERT INTO quote_status_history (quote_id, old_status, new_status, changed_by, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, oldStatus, status, changedBy || null]
      );
      await client.query('COMMIT');
      res.json(toCamelQuote(updateResult.rows[0]));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating quote status:', error);
    res.status(500).json({ error: 'Failed to update quote status' });
  }
});

// Duplicate quote
app.post('/api/quotes/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;

    const quoteResult = await pool.query('SELECT * FROM quotes WHERE id = $1', [id]);
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    const original = quoteResult.rows[0];

    const quoteNumber = await generateQuoteNumber();
    const newQuoteResult = await pool.query(
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
      ]
    );
    const newQuote = newQuoteResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY sort_order, created_at`,
      [id]
    );

    for (const item of itemsResult.rows) {
      await pool.query(
        `INSERT INTO quote_items (quote_id, service_id, custom_name, custom_note, quantity, unit_price, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          newQuote.id,
          item.service_id,
          item.custom_name,
          item.custom_note,
          item.quantity,
          item.unit_price,
          item.sort_order,
        ]
      );
    }

    const detailResult = await pool.query(
      `SELECT qi.*, s.name as service_name, s.purchase_price as service_purchase_price,
              s.sale_price as service_sale_price, s.category_id as service_category_id
       FROM quote_items qi
       LEFT JOIN services s ON qi.service_id = s.id
       WHERE qi.quote_id = $1
       ORDER BY qi.sort_order, qi.created_at`,
      [newQuote.id]
    );

    const quote = toCamelQuote(newQuote);
    quote.items = detailResult.rows.map(toCamelQuoteItem);
    res.status(201).json(quote);
  } catch (error) {
    console.error('Error duplicating quote:', error);
    res.status(500).json({ error: 'Failed to duplicate quote' });
  }
});

// Quote items

app.post('/api/quotes/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId, customName, customNote, quantity, unitPrice, sortOrder } = req.body;

    const quoteCheck = await pool.query('SELECT id FROM quotes WHERE id = $1', [id]);
    if (quoteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const result = await pool.query(
      `INSERT INTO quote_items (quote_id, service_id, custom_name, custom_note, quantity, unit_price, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [id, serviceId || null, customName || null, customNote || null, quantity ?? 1, unitPrice ?? 0, sortOrder ?? 0]
    );
    res.status(201).json(toCamelQuoteItem(result.rows[0]));
  } catch (error) {
    console.error('Error creating quote item:', error);
    res.status(500).json({ error: 'Failed to create quote item' });
  }
});

app.put('/api/quotes/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { serviceId, customName, customNote, quantity, unitPrice, sortOrder } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (serviceId !== undefined) { sets.push(`service_id = $${idx++}`); vals.push(serviceId); }
    if (customName !== undefined) { sets.push(`custom_name = $${idx++}`); vals.push(customName); }
    if (customNote !== undefined) { sets.push(`custom_note = $${idx++}`); vals.push(customNote); }
    if (quantity !== undefined) { sets.push(`quantity = $${idx++}`); vals.push(quantity); }
    if (unitPrice !== undefined) { sets.push(`unit_price = $${idx++}`); vals.push(unitPrice); }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(sortOrder); }

    sets.push(`updated_at = NOW()`);
    vals.push(itemId);
    vals.push(id);

    const result = await pool.query(
      `UPDATE quote_items SET ${sets.join(', ')} WHERE id = $${idx} AND quote_id = $${idx + 1} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote item not found' });
    }
    res.json(toCamelQuoteItem(result.rows[0]));
  } catch (error) {
    console.error('Error updating quote item:', error);
    res.status(500).json({ error: 'Failed to update quote item' });
  }
});

app.delete('/api/quotes/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const result = await pool.query('DELETE FROM quote_items WHERE id = $1 AND quote_id = $2 RETURNING *', [itemId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote item not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting quote item:', error);
    res.status(500).json({ error: 'Failed to delete quote item' });
  }
});

app.patch('/api/quotes/:id/items/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'itemIds must be an array' });
    }
    for (let i = 0; i < itemIds.length; i++) {
      await pool.query('UPDATE quote_items SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND quote_id = $3', [i, itemIds[i], id]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering quote items:', error);
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// ── Invoice CRUD ────────────────────────────────────────────────────────

app.get('/api/invoices', async (req, res) => {
  try {
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

app.get('/api/invoices/:id', async (req, res) => {
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

    // Include items from linked quote if available
    if (invoice.quoteId) {
      const itemsResult = await pool.query(`
        SELECT qi.*, s.name as service_name, s.purchase_price as service_purchase_price,
               s.sale_price as service_sale_price, s.category_id as service_category_id
        FROM quote_items qi
        LEFT JOIN services s ON qi.service_id = s.id
        WHERE qi.quote_id = $1
        ORDER BY qi.sort_order, qi.created_at
      `, [invoice.quoteId]);
      invoice.items = itemsResult.rows.map(toCamelQuoteItem);
    } else {
      invoice.items = [];
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

app.post('/api/quotes/:id/invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const vatRate = parseFloat(req.body.vatRate) || 0.19;

    const quoteResult = await pool.query(`
      SELECT q.*, c.name as customer_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `, [id]);
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    const quote = quoteResult.rows[0];
    if (quote.status !== 'accepted') {
      return res.status(400).json({ error: 'Invoice can only be created from accepted quotes' });
    }

    const existing = await pool.query('SELECT id FROM invoices WHERE quote_id = $1 LIMIT 1', [id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Invoice already exists for this quote' });
    }

    const totals = await computeQuoteTotalsForInvoice(id, vatRate);
    if (!totals) {
      return res.status(500).json({ error: 'Failed to compute invoice totals' });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const title = `Rechnung zu ${quote.title}`;
    const result = await pool.query(
      `INSERT INTO invoices (invoice_number, quote_id, project_id, customer_id, customer_name, title, status, total_net, total_gross, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [invoiceNumber, id, quote.project_id, quote.customer_id, quote.customer_name, title, 'draft', totals.totalNet, totals.totalGross, quote.notes || null]
    );

    const invoice = toCamelInvoice(result.rows[0]);
    invoice.items = [];
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
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
      vals
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

app.delete('/api/invoices/:id', async (req, res) => {
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

// ── Dashboard ───────────────────────────────────────────────────────────

app.get('/api/dashboard', async (req, res) => {
  try {
    const vatRate = parseFloat(req.query.vatRate) || 0.19;
    const vatFactor = 1 + vatRate;

    const acceptedNetSql = `
      SELECT COALESCE(SUM(net_total), 0) AS total
      FROM (
        SELECT GREATEST(0,
          COALESCE(SUM(qi.quantity * qi.unit_price), 0) -
          CASE
            WHEN q.discount_type = 'percent' THEN COALESCE(SUM(qi.quantity * qi.unit_price), 0) * q.discount_value / 100
            WHEN q.discount_type = 'amount' THEN q.discount_value
            ELSE 0
          END
        ) AS net_total
        FROM quotes q
        LEFT JOIN quote_items qi ON q.id = qi.quote_id
        WHERE q.status = 'accepted'
        GROUP BY q.id, q.discount_type, q.discount_value
      ) t
    `;

    const accepted90GrossSql = `
      SELECT COALESCE(SUM(net_total * $1), 0) AS total
      FROM (
        SELECT GREATEST(0,
          COALESCE(SUM(qi.quantity * qi.unit_price), 0) -
          CASE
            WHEN q.discount_type = 'percent' THEN COALESCE(SUM(qi.quantity * qi.unit_price), 0) * q.discount_value / 100
            WHEN q.discount_type = 'amount' THEN q.discount_value
            ELSE 0
          END
        ) AS net_total
        FROM quotes q
        LEFT JOIN quote_items qi ON q.id = qi.quote_id
        WHERE q.status = 'accepted' AND q.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY q.id, q.discount_type, q.discount_value
      ) t
    `;

    const [countsResult, acceptedNetResult, accepted90Result, topServicesResult, recentResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'draft') AS draft,
          COUNT(*) FILTER (WHERE status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
          COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
        FROM quotes
      `),
      pool.query(acceptedNetSql),
      pool.query(accepted90GrossSql, [vatFactor]),
      pool.query(`
        SELECT
          COALESCE(qi.service_id, 'custom:' || COALESCE(qi.custom_name, 'custom')) AS service_id,
          COALESCE(s.name, qi.custom_name, 'Freitext') AS name,
          SUM(qi.quantity)::int AS count,
          COALESCE(SUM(qi.quantity * qi.unit_price * $1), 0) AS total_gross
        FROM quote_items qi
        LEFT JOIN services s ON qi.service_id = s.id
        GROUP BY service_id, name
        ORDER BY count DESC
        LIMIT 5
      `, [vatFactor]),
      pool.query(`
        SELECT q.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               c.street as customer_street, c.zip as customer_zip, c.city as customer_city,
               c.country as customer_country, c.notes as customer_notes,
               c.created_at as customer_created_at, c.updated_at as customer_updated_at
        FROM quotes q
        LEFT JOIN customers c ON q.customer_id = c.id
        ORDER BY q.created_at DESC
        LIMIT 5
      `),
    ]);

    const counts = countsResult.rows[0];
    const quoteStatusCounts = {
      draft: parseInt(counts.draft, 10) || 0,
      sent: parseInt(counts.sent, 10) || 0,
      accepted: parseInt(counts.accepted, 10) || 0,
      rejected: parseInt(counts.rejected, 10) || 0,
    };

    const topServices = topServicesResult.rows.map((row) => ({
      serviceId: row.service_id,
      name: row.name,
      count: row.count,
      totalGross: parseFloat(row.total_gross),
    }));

    const aggregated = {
      quoteCount: parseInt(counts.total, 10) || 0,
      quoteStatusCounts,
      acceptedTotalNet: parseFloat(acceptedNetResult.rows[0].total),
      accepted90DayGross: parseFloat(accepted90Result.rows[0].total),
      topServices,
      recentQuotes: recentResult.rows.map(toCamelQuote),
    };

    const data = buildDashboardData(aggregated, vatRate);

    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ── Seed ────────────────────────────────────────────────────────────────

app.post('/api/seed', async (req, res) => {
  try {
    // Seed categories if empty
    const catCount = await pool.query('SELECT COUNT(*) FROM categories');
    const categorySeeds = [
      { name: 'Print & Marketing', description: 'Druck- und Marketingmaterialien', icon: 'printer', color: '#3B82F6', sortOrder: 1, visible: true },
      { name: 'Werbeartikel', description: 'Werbeartikel und giveaways', icon: 'gift', color: '#10B981', sortOrder: 2, visible: true },
      { name: 'POS Display', description: 'Point-of-Sale Displays und Aufsteller', icon: 'monitor', color: '#F59E0B', sortOrder: 3, visible: true },
      { name: 'Web & Digital', description: 'Website, Logo und digitale Services', icon: 'globe', color: '#8B5CF6', sortOrder: 4, visible: true },
      { name: 'Hosting & Domains', description: 'Domains, Hosting und E-Mail', icon: 'server', color: '#EF4444', sortOrder: 5, visible: true },
    ];

    if (parseInt(catCount.rows[0].count) === 0) {
      for (const cat of categorySeeds) {
        await pool.query(
          `INSERT INTO categories (name, description, icon, color, sort_order, visible, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [cat.name, cat.description, cat.icon, cat.color, cat.sortOrder, cat.visible]
        );
      }
    }

    // Seed services if empty
    const svcCount = await pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(svcCount.rows[0].count) > 0) {
      return res.json({ message: 'Database already has data, skipping service seed', count: parseInt(svcCount.rows[0].count) });
    }

    const serviceSeeds = [
      ['Stempel', 'Print & Marketing', 9.24, 21.64, 1, 'https://www.vistaprint.de/einladungen-und-schreibwaren/personalisierte-stempel/selbstfaerbende-stempel', 'Selbstfärbender Stempel', true],
      ['Visitenkarten (abgerundet)', 'Print & Marketing', 0.08, 71.01, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', 'Abgerundete Ecken, Standardpapier', true],
      ['Visitenkarten Standard', 'Print & Marketing', 0.07, 16.81, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', null, true],
      ['Flyer ohne Falz (A5)', 'Print & Marketing', 0.08, 51.01, 250, 'https://www.vistaprint.de/marketingmaterial/flyer', 'Format A5', true],
      ['Kugelschreiber Premium', 'Werbeartikel', 66.81, 3355.34, 50, 'https://www.vistaprint.de/werbeartikel/schreib-buerobedarf/personalisierte-kugelschreiber/premium-kugelschreiber', null, true],
      ['Jahresplaner 2026', 'Werbeartikel', 42.02, 225.08, 5, 'https://www.vistaprint.de/fotogeschenke/fotokalender/jahresplaner-2026', null, true],
      ['Dreieck-Pappaufsteller', 'POS Display', 52.10, 82.10, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/dreieck-pappaufsteller', '50×50×185 cm', true],
      ['Bodenaufsteller (vierseitig)', 'POS Display', 68.91, 118.91, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/bodenaufsteller-vierseitig', '33×33×200 cm', true],
      ['Website Design', 'Web & Digital', 0, 252.0, 1, null, 'Komplette Website inkl. Design', true],
      ['Website Anpassung', 'Web & Digital', 0, 50.0, 3, null, 'Stundenbasis pro Anpassung', true],
      ['Logo Design', 'Web & Digital', 0, 50.0, 1, null, null, true],
      ['Social Media Post', 'Web & Digital', 0, 60.0, 4, null, 'Pro Post inkl. Grafik', true],
      ['DE-Domain', 'Hosting & Domains', 12.61, 12.61, 1, null, '.de Domain pro Jahr', true],
      ['COM-Domain', 'Hosting & Domains', 13.45, 5.0, 1, null, '.com Domain pro Jahr', false],
      ['Hosting', 'Hosting & Domains', 8.40, 8.40, 1, null, 'Standard Webhosting', true],
      ['Starter Business Email 10GB', 'Hosting & Domains', 19.33, 39.33, 1, null, 'Pro Postfach / Jahr', true],
      ['Google Workspace (Starter)', 'Hosting & Domains', 72.27, 104.03, 1, null, 'Pro User / Jahr', true],
    ];

    for (const [name, categoryName, purchasePrice, salePrice, defaultQuantity, url, note, visible] of serviceSeeds) {
      await pool.query(
        `INSERT INTO services (name, category_id, purchase_price, sale_price, default_quantity, url, note, visible, created_at, updated_at)
         VALUES ($1, (SELECT id FROM categories WHERE name = $2), $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [name, categoryName, purchasePrice, salePrice, defaultQuantity, url, note, visible]
      );
    }

    res.json({ message: 'Database seeded successfully', categories: categorySeeds.length, services: serviceSeeds.length });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Startup: ensure tables exist ─────────────────────────────────────────

async function ensureTables() {
  // Ensure the services table has the pinned column (migration for existing databases)
  await pool.query(`
    ALTER TABLE services
    ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_services_pinned ON services(pinned DESC)`);

  // Customers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      street TEXT,
      zip TEXT,
      city TEXT,
      country TEXT DEFAULT 'Deutschland',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);

  // Quotes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quote_number VARCHAR(20) UNIQUE,
      title TEXT NOT NULL DEFAULT 'Neues Angebot',
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      discount_type TEXT,
      discount_value NUMERIC NOT NULL DEFAULT 0,
      notes TEXT,
      valid_until DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number)`);

  // Quote items table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quote_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      custom_name TEXT,
      custom_note TEXT,
      unit_price NUMERIC NOT NULL DEFAULT 0,
      quantity NUMERIC NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id, sort_order)`);

  // Migration: add customer_id to existing quotes tables
  await pool.query(`
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL
  `);

  // Quote status history table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quote_status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote ON quote_status_history(quote_id, created_at DESC)`);

  // Projects table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id)`);

  // Migration: add project_id to existing quotes tables
  await pool.query(`
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL
  `);

  console.log('Database tables ensured');
}

ensureTables().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to ensure database tables:', err);
  process.exit(1);
});