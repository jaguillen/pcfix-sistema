-- PCFix - Proyectar datos existentes desde records a tablas profesionales
-- Ejecutar despues de supabase-crear-tablas-profesionales.sql.

TRUNCATE TABLE
  order_parts,
  purchase_items,
  payments,
  appointments,
  warranty_claims,
  inventory_movements,
  audit_entries,
  purchases,
  service_orders,
  inventory_items,
  suppliers,
  clients,
  app_settings
RESTART IDENTITY CASCADE;

INSERT INTO app_settings (id,business_name,business_phone,business_address,whatsapp_template,theme,raw_data,updated_at)
SELECT
  'settings',
  data->>'businessName',
  data->>'businessPhone',
  data->>'businessAddress',
  data->>'whatsappTemplate',
  COALESCE(data->'theme', '{}'::jsonb),
  data,
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'settings'
ORDER BY updated_at DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  business_phone = EXCLUDED.business_phone,
  business_address = EXCLUDED.business_address,
  whatsapp_template = EXCLUDED.whatsapp_template,
  theme = EXCLUDED.theme,
  raw_data = EXCLUDED.raw_data,
  updated_at = EXCLUDED.updated_at;

INSERT INTO clients (id,name,phone,email,address,archived,raw_data,created_at,updated_at)
SELECT
  id,
  COALESCE(NULLIF(data->>'name', ''), 'Cliente'),
  data->>'phone',
  data->>'email',
  data->>'address',
  archived OR COALESCE((data->>'archived')::boolean, false),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'client'
ON CONFLICT (id) DO NOTHING;

INSERT INTO suppliers (id,name,contact,phone,email,category,notes,archived,raw_data,created_at,updated_at)
SELECT
  id,
  COALESCE(NULLIF(data->>'name', ''), 'Proveedor'),
  data->>'contact',
  data->>'phone',
  data->>'email',
  data->>'category',
  data->>'notes',
  archived OR COALESCE((data->>'archived')::boolean, false),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'supplier'
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_items (id,brand,model,name,category,stock,min_stock,cost,subdealer_price,price,archived,raw_data,created_at,updated_at)
SELECT
  id,
  data->>'brand',
  data->>'model',
  COALESCE(NULLIF(data->>'name', ''), concat_ws(' ', data->>'brand', data->>'model'), 'Articulo'),
  data->>'category',
  GREATEST(COALESCE(NULLIF(data->>'stock', '')::numeric, 0), 0),
  GREATEST(COALESCE(NULLIF(COALESCE(data->>'min', data->>'minStock'), '')::numeric, 1), 0),
  GREATEST(COALESCE(NULLIF(data->>'cost', '')::numeric, 0), 0),
  GREATEST(COALESCE(NULLIF(data->>'subdealerPrice', '')::numeric, 0), 0),
  GREATEST(COALESCE(NULLIF(data->>'price', '')::numeric, 0), 0),
  archived OR COALESCE((data->>'archived')::boolean, false),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'inventory'
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_orders (id,folio,tracking_code,client_id,device,technician,serial,status,issue,notes,accessories,physical_state,total,deposit,paid,warranty_days,warranty_terms,approved,quote_part_name,quote_supplier_id,archived,status_history,status_evidence_photos,raw_data,created_at,updated_at)
SELECT
  id,
  COALESCE(NULLIF(data->>'folio', ''), id),
  data->>'trackingCode',
  data->>'clientId',
  COALESCE(NULLIF(data->>'device', ''), 'Equipo'),
  data->>'technician',
  data->>'serial',
  COALESCE(NULLIF(data->>'status', ''), 'Recibido'),
  data->>'issue',
  data->>'notes',
  data->>'accessories',
  data->>'physicalState',
  GREATEST(COALESCE(NULLIF(data->>'total', '')::numeric, 0), 0),
  GREATEST(COALESCE(NULLIF(data->>'deposit', '')::numeric, 0), 0),
  COALESCE((data->>'paid')::boolean, false),
  GREATEST(COALESCE(NULLIF(data->>'warrantyDays', '')::int, 90), 0),
  data->>'warrantyTerms',
  COALESCE((data->>'approved')::boolean, false),
  data->>'quotePartName',
  data->>'quoteSupplierId',
  archived OR COALESCE((data->>'archived')::boolean, false),
  COALESCE(data->'statusHistory', '[]'::jsonb),
  COALESCE(data->'statusEvidencePhotos', '[]'::jsonb),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'order'
ON CONFLICT (id) DO UPDATE SET
  folio = EXCLUDED.folio,
  tracking_code = EXCLUDED.tracking_code,
  client_id = EXCLUDED.client_id,
  device = EXCLUDED.device,
  technician = EXCLUDED.technician,
  serial = EXCLUDED.serial,
  status = EXCLUDED.status,
  issue = EXCLUDED.issue,
  notes = EXCLUDED.notes,
  accessories = EXCLUDED.accessories,
  physical_state = EXCLUDED.physical_state,
  total = EXCLUDED.total,
  deposit = EXCLUDED.deposit,
  paid = EXCLUDED.paid,
  warranty_days = EXCLUDED.warranty_days,
  warranty_terms = EXCLUDED.warranty_terms,
  approved = EXCLUDED.approved,
  quote_part_name = EXCLUDED.quote_part_name,
  quote_supplier_id = EXCLUDED.quote_supplier_id,
  archived = EXCLUDED.archived,
  status_history = EXCLUDED.status_history,
  status_evidence_photos = EXCLUDED.status_evidence_photos,
  raw_data = EXCLUDED.raw_data,
  updated_at = EXCLUDED.updated_at;

INSERT INTO order_parts (id,order_id,inventory_id,purchase_id,purchase_item_id,part_name,qty,cost,total_cost,raw_data,created_at)
SELECT
  COALESCE(part->>'id', 'op-' || r.id || '-' || ordinality),
  r.id,
  part->>'inventoryId',
  part->>'purchaseId',
  part->>'purchaseItemId',
  COALESCE(NULLIF(part->>'part', ''), 'Refaccion'),
  GREATEST(COALESCE(NULLIF(part->>'qty', '')::numeric, 1), 0.01),
  GREATEST(COALESCE(NULLIF(part->>'cost', '')::numeric, 0), 0),
  GREATEST(COALESCE(NULLIF(part->>'totalCost', '')::numeric, COALESCE(NULLIF(part->>'qty', '')::numeric, 1) * COALESCE(NULLIF(part->>'cost', '')::numeric, 0)), 0),
  part,
  COALESCE(part->>'createdAt', r.updated_at, now()::text)
FROM records r
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.data->'suppliedParts', '[]'::jsonb)) WITH ORDINALITY AS parts(part, ordinality)
WHERE r.type = 'order'
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchases (id,folio,supplier_id,order_id,part,qty,cost,status,notes,received_at,received_quantities,archived,raw_data,created_at,updated_at)
SELECT
  id,
  COALESCE(NULLIF(data->>'folio', ''), id),
  data->>'supplierId',
  data->>'orderId',
  data->>'part',
  GREATEST(COALESCE(NULLIF(data->>'qty', '')::numeric, 1), 0),
  GREATEST(COALESCE(NULLIF(data->>'cost', '')::numeric, 0), 0),
  COALESCE(NULLIF(data->>'status', ''), 'Cotizando'),
  data->>'notes',
  data->>'receivedAt',
  COALESCE(data->'receivedQuantities', '{}'::jsonb),
  archived OR COALESCE((data->>'archived')::boolean, false),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'purchase'
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_items (id,purchase_id,part,qty,cost,raw_data)
SELECT
  COALESCE(item->>'id', 'pitem-' || r.id || '-' || ordinality),
  r.id,
  COALESCE(NULLIF(item->>'part', ''), r.data->>'part', 'Producto'),
  GREATEST(COALESCE(NULLIF(item->>'qty', '')::numeric, 1), 0.01),
  GREATEST(COALESCE(NULLIF(item->>'cost', '')::numeric, 0), 0),
  item
FROM records r
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_array_length(COALESCE(r.data->'items', '[]'::jsonb)) > 0 THEN r.data->'items'
    ELSE jsonb_build_array(jsonb_build_object('id', 'pitem-' || r.id, 'part', r.data->>'part', 'qty', r.data->>'qty', 'cost', r.data->>'cost'))
  END
) WITH ORDINALITY AS items(item, ordinality)
WHERE r.type = 'purchase'
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id,order_id,amount,method,reference,archived,raw_data,created_at,updated_at)
SELECT
  id,
  data->>'orderId',
  GREATEST(COALESCE(NULLIF(data->>'amount', '')::numeric, 0), 0),
  data->>'method',
  data->>'reference',
  archived OR COALESCE((data->>'archived')::boolean, false),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'payment'
ON CONFLICT (id) DO NOTHING;

INSERT INTO appointments (id,client_id,order_id,date,time,type,notes,archived,raw_data,created_at,updated_at)
SELECT
  id,
  data->>'clientId',
  data->>'orderId',
  data->>'date',
  data->>'time',
  data->>'type',
  data->>'notes',
  archived OR COALESCE((data->>'archived')::boolean, false),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'appointment'
ON CONFLICT (id) DO NOTHING;

INSERT INTO warranty_claims (id,order_id,reason,resolution,status,cost,archived,raw_data,created_at,updated_at)
SELECT
  id,
  data->>'orderId',
  data->>'reason',
  data->>'resolution',
  data->>'status',
  GREATEST(COALESCE(NULLIF(data->>'cost', '')::numeric, 0), 0),
  archived OR COALESCE((data->>'archived')::boolean, false),
  data,
  COALESCE(data->>'createdAt', created_at, now()::text),
  COALESCE(data->>'updatedAt', updated_at, now()::text)
FROM records
WHERE type = 'warrantyClaim'
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_movements (id,item_id,item_name,qty,type,detail,ref_id,raw_data,created_at)
SELECT
  id,
  data->>'itemId',
  data->>'itemName',
  COALESCE(NULLIF(data->>'qty', '')::numeric, 0),
  data->>'type',
  data->>'detail',
  data->>'refId',
  data,
  COALESCE(data->>'createdAt', created_at, now()::text)
FROM records
WHERE type = 'inventoryMovement'
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_entries (id,type,detail,ref_id,raw_data,created_at)
SELECT
  id,
  data->>'type',
  data->>'detail',
  data->>'refId',
  data,
  COALESCE(data->>'createdAt', created_at, now()::text)
FROM records
WHERE type = 'auditEntry'
ON CONFLICT (id) DO NOTHING;

-- Las restricciones unicas fuertes las aplica el backend despues de reparar duplicados.
-- Si este script se ejecuta manualmente antes de la reparacion, no bloquea la creacion de tablas por folios repetidos.
