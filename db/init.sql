CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  purchase_price DECIMAL(10, 4) NOT NULL,
  sale_price DECIMAL(10, 4) NOT NULL,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  url TEXT,
  note TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_visible ON services(visible);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

-- Seed data
INSERT INTO services (name, category, purchase_price, sale_price, default_quantity, url, note, visible) VALUES
  ('Stempel', 'Print & Marketing', 9.24, 21.64, 1, 'https://www.vistaprint.de/einladungen-und-schreibwaren/personalisierte-stempel/selbstfaerbende-stempel', 'Selbstfärbender Stempel', true),
  ('Visitenkarten (abgerundet)', 'Print & Marketing', 0.08, 71.01, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', 'Abgerundete Ecken, Standardpapier', true),
  ('Visitenkarten Standard', 'Print & Marketing', 0.07, 16.81, 250, 'https://www.vistaprint.de/visitenkarten/abgerundete-ecken', NULL, true),
  ('Flyer ohne Falz (A5)', 'Print & Marketing', 0.08, 51.01, 250, 'https://www.vistaprint.de/marketingmaterial/flyer', 'Format A5', true),
  ('Kugelschreiber Premium', 'Werbeartikel', 66.81, 3355.34, 50, 'https://www.vistaprint.de/werbeartikel/schreib-buerobedarf/personalisierte-kugelschreiber/premium-kugelschreiber', NULL, true),
  ('Jahresplaner 2026', 'Werbeartikel', 42.02, 225.08, 5, 'https://www.vistaprint.de/fotogeschenke/fotokalender/jahresplaner-2026', NULL, true),
  ('Dreieck-Pappaufsteller', 'POS Display', 52.10, 82.10, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/dreieck-pappaufsteller', '50×50×185 cm', true),
  ('Bodenaufsteller (vierseitig)', 'POS Display', 68.91, 118.91, 1, 'https://www.vistaprint.de/werbetechnik/pos-displays/bodenaufsteller-vierseitig', '33×33×200 cm', true),
  ('Website Design', 'Web & Digital', 0, 252.0, 1, NULL, 'Komplette Website inkl. Design', true),
  ('Website Anpassung', 'Web & Digital', 0, 50.0, 3, NULL, 'Stundenbasis pro Anpassung', true),
  ('Logo Design', 'Web & Digital', 0, 50.0, 1, NULL, NULL, true),
  ('Social Media Post', 'Web & Digital', 0, 60.0, 4, NULL, 'Pro Post inkl. Grafik', true),
  ('DE-Domain', 'Hosting & Domains', 12.61, 12.61, 1, NULL, '.de Domain pro Jahr', true),
  ('COM-Domain', 'Hosting & Domains', 13.45, 5.0, 1, NULL, '.com Domain pro Jahr', false),
  ('Hosting', 'Hosting & Domains', 8.40, 8.40, 1, NULL, 'Standard Webhosting', true),
  ('Starter Business Email 10GB', 'Hosting & Domains', 19.33, 39.33, 1, NULL, 'Pro Postfach / Jahr', true),
  ('Google Workspace (Starter)', 'Hosting & Domains', 72.27, 104.03, 1, NULL, 'Pro User / Jahr', true);