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
