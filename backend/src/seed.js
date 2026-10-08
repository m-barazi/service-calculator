import { Router } from 'express';
import { pool } from './db.js';

export const seedRouter = Router();

seedRouter.post('/', async (req, res) => {
  try {
    const catCount = await pool.query('SELECT COUNT(*) FROM categories');
    const categorySeeds = [
      { name: 'Print & Marketing', description: 'Visitenkarten, Flyer, Briefpapier', icon: 'printer', color: '#3B82F6', sortOrder: 0, visible: true },
      { name: 'Werbeartikel', description: 'Kugelschreiber, Planer und Give-aways', icon: 'gift', color: '#10B981', sortOrder: 1, visible: true },
      { name: 'POS Display', description: 'Point-of-Sale Displays und Aufsteller', icon: 'monitor', color: '#F59E0B', sortOrder: 3, visible: true },
      { name: 'Web & Digital', description: 'Website, Logo und digitale Services', icon: 'globe', color: '#8B5CF6', sortOrder: 4, visible: true },
      { name: 'Hosting & Domains', description: 'Domains, Hosting und E-Mail', icon: 'server', color: '#EF4444', sortOrder: 5, visible: true },
    ];

    if (parseInt(catCount.rows[0].count) === 0) {
      for (const cat of categorySeeds) {
        await pool.query(
          `INSERT INTO categories (name, description, icon, color, sort_order, visible, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [cat.name, cat.description, cat.icon, cat.color, cat.sortOrder, cat.visible],
        );
      }
    }

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
        [name, categoryName, purchasePrice, salePrice, defaultQuantity, url, note, visible],
      );
    }

    res.json({ message: 'Database seeded successfully', categories: categorySeeds.length, services: serviceSeeds.length });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});
