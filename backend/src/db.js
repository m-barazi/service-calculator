import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'service_calculator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

export async function ensureTables() {
  // Ensure the services table has the pinned column (migration for existing databases)
  await pool.query(`
    ALTER TABLE services
    ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_services_pinned ON services(pinned DESC)`);

  // Categories table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      visible BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name)`);

  // Services table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      purchase_price NUMERIC NOT NULL DEFAULT 0,
      sale_price NUMERIC NOT NULL DEFAULT 0,
      default_quantity INTEGER NOT NULL DEFAULT 1,
      url TEXT,
      note TEXT,
      visible BOOLEAN NOT NULL DEFAULT true,
      pinned BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id)`);

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

  // Migration: add quote_number to existing quotes tables that predate it
  await pool.query(`
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS quote_number VARCHAR(20) UNIQUE
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
      purchase_price NUMERIC,
      quantity NUMERIC NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id, sort_order)`);

  // Migration: add purchase_price to existing quote_items tables
  await pool.query(`
    ALTER TABLE quote_items
    ADD COLUMN IF NOT EXISTS purchase_price NUMERIC
  `);

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

  // Invoices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number VARCHAR(20) UNIQUE NOT NULL,
      quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      due_date DATE,
      paid_at TIMESTAMPTZ,
      notes TEXT,
      total_net NUMERIC NOT NULL DEFAULT 0,
      total_gross NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_quote ON invoices(quote_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC)`);

  // Ensure a quote can only have one invoice
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_quote
    ON invoices(quote_id)
    WHERE quote_id IS NOT NULL
  `);

  // Invoice items table — immutable snapshot of the billed positions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      custom_name TEXT,
      custom_note TEXT,
      quantity NUMERIC NOT NULL DEFAULT 1,
      unit_price NUMERIC NOT NULL DEFAULT 0,
      purchase_price NUMERIC,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id, sort_order)`);

  // Migration: backfill invoice_items from linked quote_items for existing invoices
  await pool.query(`
    INSERT INTO invoice_items (invoice_id, service_id, custom_name, custom_note, quantity, unit_price, purchase_price, sort_order, created_at, updated_at)
    SELECT i.id, qi.service_id, qi.custom_name, qi.custom_note, qi.quantity, qi.unit_price, qi.purchase_price, qi.sort_order, qi.created_at, qi.updated_at
    FROM invoices i
    JOIN quote_items qi ON i.quote_id = qi.quote_id
    WHERE NOT EXISTS (
      SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
    )
  `);

  // Atomic sequence-based number generators to avoid race conditions
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1`);
  await pool.query(`
    SELECT setval('quote_number_seq', GREATEST(
      COALESCE((SELECT last_value FROM quote_number_seq), 0),
      COALESCE((SELECT MAX(CAST(SUBSTRING(quote_number FROM '-([0-9]+)$') AS INTEGER)) FROM quotes WHERE quote_number LIKE 'AN-%'), 0)
    ), true)
  `);

  await pool.query(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1`);
  await pool.query(`
    SELECT setval('invoice_number_seq', GREATEST(
      COALESCE((SELECT last_value FROM invoice_number_seq), 0),
      COALESCE((SELECT MAX(CAST(SUBSTRING(invoice_number FROM '-([0-9]+)$') AS INTEGER)) FROM invoices WHERE invoice_number LIKE 'RE-%'), 0)
    ), true)
  `);

  // Users table for authentication
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

  console.log('Database tables ensured');
}
