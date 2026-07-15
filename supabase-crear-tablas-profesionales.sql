-- PCFix - Crear tablas profesionales en Supabase
-- Ejecutar en Supabase > SQL Editor.

DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS files CASCADE;

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'settings',
  business_name TEXT,
  business_phone TEXT,
  business_address TEXT,
  whatsapp_template TEXT,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

DROP INDEX IF EXISTS uq_clients_phone_active;
CREATE INDEX IF NOT EXISTS idx_clients_phone_active
  ON clients (regexp_replace(COALESCE(phone, ''), '\D', '', 'g'))
  WHERE archived = FALSE AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') <> '';

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  category TEXT,
  notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  brand TEXT,
  model TEXT,
  name TEXT NOT NULL,
  category TEXT,
  stock NUMERIC NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock NUMERIC NOT NULL DEFAULT 1 CHECK (min_stock >= 0),
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  subdealer_price NUMERIC NOT NULL DEFAULT 0 CHECK (subdealer_price >= 0),
  price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_inventory_brand_model ON inventory_items (brand, model);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items (category);

CREATE TABLE IF NOT EXISTS service_orders (
  id TEXT PRIMARY KEY,
  folio TEXT NOT NULL,
  tracking_code TEXT,
  client_id TEXT,
  device TEXT NOT NULL,
  technician TEXT,
  serial TEXT,
  status TEXT NOT NULL,
  issue TEXT,
  notes TEXT,
  accessories TEXT,
  physical_state TEXT,
  total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
  deposit NUMERIC NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  warranty_days INTEGER NOT NULL DEFAULT 90 CHECK (warranty_days >= 0),
  warranty_terms TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  quote_part_name TEXT,
  quote_supplier_id TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  status_evidence_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

DROP INDEX IF EXISTS uq_service_orders_folio_active;
DROP INDEX IF EXISTS uq_service_orders_tracking_active;
CREATE INDEX IF NOT EXISTS idx_service_orders_client ON service_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders (status);

CREATE TABLE IF NOT EXISTS order_parts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  inventory_id TEXT,
  purchase_id TEXT,
  purchase_item_id TEXT,
  part_name TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1 CHECK (qty > 0),
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  total_cost NUMERIC NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_order_parts_order ON order_parts (order_id);
CREATE INDEX IF NOT EXISTS idx_order_parts_inventory ON order_parts (inventory_id);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  folio TEXT NOT NULL,
  supplier_id TEXT,
  order_id TEXT,
  part TEXT,
  qty NUMERIC NOT NULL DEFAULT 1 CHECK (qty >= 0),
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  status TEXT NOT NULL,
  notes TEXT,
  received_at TEXT,
  received_quantities JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

DROP INDEX IF EXISTS uq_purchases_folio_active;
CREATE INDEX IF NOT EXISTS idx_purchases_order ON purchases (order_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases (supplier_id);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  part TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1 CHECK (qty > 0),
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items (purchase_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  method TEXT,
  reference TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  order_id TEXT,
  date TEXT,
  time TEXT,
  type TEXT,
  notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  reason TEXT,
  resolution TEXT,
  status TEXT,
  cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text,
  updated_at TEXT NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_order ON warranty_claims (order_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  item_name TEXT,
  qty NUMERIC NOT NULL DEFAULT 0,
  type TEXT,
  detail TEXT,
  ref_id TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements (item_id);

CREATE TABLE IF NOT EXISTS audit_entries (
  id TEXT PRIMARY KEY,
  type TEXT,
  detail TEXT,
  ref_id TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_orders_folio_active
  ON service_orders (lower(folio))
  WHERE archived = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_orders_tracking_active
  ON service_orders (tracking_code)
  WHERE archived = FALSE AND COALESCE(tracking_code, '') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_folio_active
  ON purchases (lower(folio))
  WHERE archived = FALSE;
