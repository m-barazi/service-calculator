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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});