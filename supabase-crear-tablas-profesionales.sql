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
  sku TEXT,
  location TEXT,
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
  priority TEXT NOT NULL DEFAULT 'Normal',
  promised_at TEXT,
  approval_status TEXT NOT NULL DEFAULT 'Pendiente',
  issue TEXT,
  notes TEXT,
  accessories TEXT,
  physical_state TEXT,
  total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
  labor_cost NUMERIC NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
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
  updated_at TEXT NOT NULL DEFAULT now()::text,
  completed_at TEXT
);

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'Normal';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS promised_at TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Pendiente';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS labor_cost NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS completed_at TEXT;
UPDATE service_orders SET completed_at = updated_at WHERE status = 'Entregado' AND COALESCE(completed_at, '') = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_sku_active
  ON inventory_items (lower(sku))
  WHERE archived = FALSE AND COALESCE(sku, '') <> '';

DROP INDEX IF EXISTS uq_service_orders_folio_active;
DROP INDEX IF EXISTS uq_service_orders_tracking_active;
CREATE INDEX IF NOT EXISTS idx_service_orders_client ON service_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders (status);
CREATE INDEX IF NOT EXISTS idx_service_orders_promised ON service_orders (promised_at) WHERE archived = FALSE;

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

CREATE TABLE IF NOT EXISTS order_approvals (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('Aprobado','Rechazado')),
  customer_name TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_order_approvals_order ON order_approvals (order_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_orders_folio_active
  ON service_orders (lower(folio))
  WHERE archived = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_orders_tracking_active
  ON service_orders (tracking_code)
  WHERE archived = FALSE AND COALESCE(tracking_code, '') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_folio_active
  ON purchases (lower(folio))
  WHERE archived = FALSE;

UPDATE service_orders SET client_id = NULL WHERE client_id = '';
UPDATE purchases SET supplier_id = NULL WHERE supplier_id = '';
UPDATE purchases SET order_id = NULL WHERE order_id = '';
UPDATE payments SET order_id = NULL WHERE order_id = '';
UPDATE warranty_claims SET order_id = NULL WHERE order_id = '';
UPDATE inventory_movements SET item_id = NULL WHERE item_id = '';
UPDATE service_orders o SET client_id = NULL WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = o.client_id);
UPDATE purchases p SET supplier_id = NULL WHERE supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = p.supplier_id);
UPDATE purchases p SET order_id = NULL WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_orders o WHERE o.id = p.order_id);
UPDATE payments p SET order_id = NULL WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_orders o WHERE o.id = p.order_id);
UPDATE warranty_claims w SET order_id = NULL WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_orders o WHERE o.id = w.order_id);
UPDATE inventory_movements m SET item_id = NULL WHERE item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.id = m.item_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_orders_client') THEN
    ALTER TABLE service_orders ADD CONSTRAINT fk_service_orders_client FOREIGN KEY (client_id) REFERENCES clients(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchases_supplier') THEN
    ALTER TABLE purchases ADD CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchases_order') THEN
    ALTER TABLE purchases ADD CONSTRAINT fk_purchases_order FOREIGN KEY (order_id) REFERENCES service_orders(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_order') THEN
    ALTER TABLE payments ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES service_orders(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_warranties_order') THEN
    ALTER TABLE warranty_claims ADD CONSTRAINT fk_warranties_order FOREIGN KEY (order_id) REFERENCES service_orders(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movements_item') THEN
    ALTER TABLE inventory_movements ADD CONSTRAINT fk_movements_item FOREIGN KEY (item_id) REFERENCES inventory_items(id) NOT VALID;
  END IF;
END $$;

-- El sistema usa exclusivamente el backend. Bloquea acceso directo anonimo a Data API.
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_approvals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  app_settings, clients, suppliers, inventory_items, service_orders, order_parts,
  purchases, purchase_items, payments, appointments, warranty_claims,
  inventory_movements, audit_entries, order_approvals
FROM anon, authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_service_orders_client') THEN
    ALTER TABLE service_orders VALIDATE CONSTRAINT fk_service_orders_client;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchases_supplier') THEN
    ALTER TABLE purchases VALIDATE CONSTRAINT fk_purchases_supplier;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchases_order') THEN
    ALTER TABLE purchases VALIDATE CONSTRAINT fk_purchases_order;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_order') THEN
    ALTER TABLE payments VALIDATE CONSTRAINT fk_payments_order;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_warranties_order') THEN
    ALTER TABLE warranty_claims VALIDATE CONSTRAINT fk_warranties_order;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_movements_item') THEN
    ALTER TABLE inventory_movements VALIDATE CONSTRAINT fk_movements_item;
  END IF;
END $$;
