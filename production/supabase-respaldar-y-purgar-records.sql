-- PCFix - Respaldar y purgar records legacy
-- Ejecutar SOLO despues de:
-- 1) supabase-crear-tablas-profesionales.sql
-- 2) supabase-proyectar-records-a-tablas.sql
-- 3) verificar que service_orders, clients, purchases, inventory_items, etc. ya tengan datos.

BEGIN;

CREATE TABLE IF NOT EXISTS records_legacy_backup (
  backup_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  id TEXT,
  type TEXT,
  data JSONB,
  archived BOOLEAN,
  created_at TEXT,
  updated_at TEXT
);

INSERT INTO records_legacy_backup (id,type,data,archived,created_at,updated_at)
SELECT id,type,data,archived,created_at,updated_at
FROM records
WHERE type IN (
  'settings',
  'client',
  'order',
  'inventory',
  'supplier',
  'appointment',
  'purchase',
  'payment',
  'inventoryMovement',
  'warrantyClaim',
  'auditEntry'
);

DROP TABLE IF EXISTS records;

COMMIT;

-- Verificacion sugerida despues de ejecutar:
-- SELECT COUNT(*) FROM records_legacy_backup;
-- SELECT folio, device, created_at FROM service_orders WHERE folio = 'PCF-2026-0004';
