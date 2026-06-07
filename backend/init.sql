-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id),
  purchase_price DECIMAL(10, 4) NOT NULL,
  sale_price DECIMAL(10, 4) NOT NULL,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  url TEXT,
  note TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_visible ON services(visible);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

-- Seed categories
INSERT INTO categories (name, description, icon, color, sort_order) VALUES
  ('Print & Marketing', 'Druck- und Marketingdienstleistungen', '🖨️', '#10b981', 1),
  ('Web & Digital', 'Website, Logo und digitale Dienste', '🌐', '#3b82f6', 2),
  ('Hosting & Domains', 'Hosting, Domains und E-Mail', '🖥️', '#8b5cf6', 3),
  ('Kasse & Displays', 'POS-Displays und Kassensysteme', '🏪', '#f59e0b', 4),
  ('Werbeartikel', 'Promotion- und Werbeartikel', '🎁', '#ef4444', 5);

-- Seed services (referencing categories by name)
INSERT INTO services (name, category_id, purchase_price, sale_price, default_quantity, url, note, visible)
  SELECT 'Stempel', c.id, 9.24, 21.64, 1, 'https://www.vistaprint.de/einladungen-und-schreibwaren/personalisierte-stempel/selbstfaerbende-stempel', 'Selbstfärbender Stempel', true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
  SELECT 'Visitenkarten (abgerundet)', c.id, 0.08, 71.01, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', 'Abgerundete Ecken, Standardpapier', true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
  SELECT 'Visitenkarten Standard', c.id, 0.07, 16.81, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', NULL, true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
  SELECT 'Flyer ohne Falz (A5)', c.id, 0.08, 51.01, 250, 'https://www.vistaprint.de/marketingmaterial/flyer', 'Format A5', true FROM categories c WHERE c.name = 'Print & Marketing'
UNION ALL
  SELECT 'Kugelschreiber Premium', c.id, 66.81, 3355.34, 50, 'https://www.vistaprint.de/werbeartikel/schreib-buerobedarf/personalisierte-kugelschreiber/premium-kugelschreiber', NULL, true FROM categories c WHERE c.name = 'Werbeartikel'
UNION ALL
  SELECT 'Jahresplaner 2026', c.id, 42.02, 225.08, 5, 'https://www.vistaprint.de/fotogeschenke/fotokalender/jahresplaner-2026', NULL, true FROM categories c WHERE c.name = 'Werbeartikel'
UNION ALL
  SELECT 'Dreieck-Pappaufsteller', c.id, 52.10, 82.10, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/dreieck-pappaufsteller', '50×50×185 cm', true FROM categories c WHERE c.name = 'Kasse & Displays'
UNION ALL
  SELECT 'Bodenaufsteller (vierseitig)', c.id, 68.91, 118.91, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/bodenaufsteller-vierseitig', '33×33×200 cm', true FROM categories c WHERE c.name = 'Kasse & Displays'
UNION ALL
  SELECT 'Website Design', c.id, 0, 252.0, 1, NULL, 'Komplette Website inkl. Design', true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
  SELECT 'Website Anpassung', c.id, 0, 50.0, 3, NULL, 'Stundenbasis pro Anpassung', true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
  SELECT 'Logo Design', c.id, 0, 50.0, 1, NULL, NULL, true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
  SELECT 'Social Media Post', c.id, 0, 60.0, 4, NULL, 'Pro Post inkl. Grafik', true FROM categories c WHERE c.name = 'Web & Digital'
UNION ALL
  SELECT 'DE-Domain', c.id, 12.61, 12.61, 1, NULL, '.de Domain pro Jahr', true FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
  SELECT 'COM-Domain', c.id, 13.45, 5.0, 1, NULL, '.com Domain pro Jahr', false FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
  SELECT 'Hosting', c.id, 8.40, 8.40, 1, NULL, 'Standard Webhosting', true FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
  SELECT 'Starter Business Email 10GB', c.id, 19.33, 39.33, 1, NULL, 'Pro Postfach / Jahr', true FROM categories c WHERE c.name = 'Hosting & Domains'
UNION ALL
  SELECT 'Google Workspace (Starter)', c.id, 72.27, 104.03, 1, NULL, 'Pro User / Jahr', true FROM categories c WHERE c.name = 'Hosting & Domains';