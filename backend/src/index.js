import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

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

app.get('/api/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY category_id, name');
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
    const { name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible } = req.body;
    const result = await pool.query(
      `INSERT INTO services (name, category_id, purchase_price, sale_price, default_quantity, url, note, visible, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible ?? true]
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
    const { name, categoryId, purchasePrice, salePrice, defaultQuantity, url, note, visible } = req.body;

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

// ── Quote CRUD ───────────────────────────────────────────────────────────

function toCamelQuote(row) {
  return {
    id: row.id,
    title: row.title,
    customerName: row.customer_name,
    status: row.status,
    discountType: row.discount_type,
    discountValue: parseFloat(row.discount_value ?? 0),
    notes: row.notes,
    validUntil: row.valid_until ? (row.valid_until.toISOString ? row.valid_until.toISOString().slice(0, 10) : String(row.valid_until).slice(0, 10)) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    const result = await pool.query('SELECT * FROM quotes ORDER BY created_at DESC');
    res.json(result.rows.map(toCamelQuote));
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quoteResult = await pool.query('SELECT * FROM quotes WHERE id = $1', [id]);
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

app.post('/api/quotes', async (req, res) => {
  try {
    const { title, customerName, status, discountType, discountValue, notes, validUntil } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const result = await pool.query(
      `INSERT INTO quotes (title, customer_name, status, discount_type, discount_value, notes, valid_until, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [title, customerName || null, status || 'draft', discountType || null, discountValue ?? 0, notes || null, validUntil || null]
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
    const { title, customerName, status, discountType, discountValue, notes, validUntil } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (title !== undefined) { sets.push(`title = $${idx++}`); vals.push(title); }
    if (customerName !== undefined) { sets.push(`customer_name = $${idx++}`); vals.push(customerName); }
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL DEFAULT 'Neues Angebot',
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