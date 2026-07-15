import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL. Configura Supabase/Neon/Postgres en Render.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false }
});

const allowedTypes = new Set([
  "settings",
  "client",
  "order",
  "inventory",
  "supplier",
  "appointment",
  "purchase",
  "payment",
  "inventoryMovement",
  "warrantyClaim",
  "auditEntry"
]);

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function appendConsecutive(value, number) {
  const base = String(value || "").trim();
  return `${base || "REGISTRO"}-${number}`;
}

function safeJsonField(field) {
  if (!["folio", "trackingCode"].includes(field)) throw new Error("Campo JSON no permitido");
  return field;
}

function asNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function asJson(value, fallback = []) {
  return JSON.stringify(value ?? fallback);
}

function normalizeRecord(row) {
  return {
    id: row.id,
    type: row.type,
    data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
    archived: Boolean(row.archived),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','technician','viewer')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data JSONB NOT NULL,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
    CREATE INDEX IF NOT EXISTS idx_records_archived ON records(archived);
    CREATE INDEX IF NOT EXISTS idx_records_order_folio_lookup ON records (lower(data->>'folio')) WHERE type = 'order' AND archived = FALSE;
    CREATE INDEX IF NOT EXISTS idx_records_order_tracking_lookup ON records ((data->>'trackingCode')) WHERE type = 'order' AND archived = FALSE;

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      record_type TEXT,
      record_id TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      direction TEXT NOT NULL CHECK(direction IN ('in','out')),
      phone TEXT NOT NULL,
      text TEXT,
      payload JSONB,
      status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL
    );
  `);

  await runStabilityMigration();

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@pcfix.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Cambiar123!";
  const existing = await query("SELECT id FROM users WHERE email = $1", [adminEmail]);
  if (!existing.rows.length) {
    await query(
      "INSERT INTO users (id,name,email,password_hash,role,active,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id("usr"), "Administrador PCFix", adminEmail, await bcrypt.hash(adminPassword, 12), "admin", true, now()]
    );
    console.log(`Admin inicial creado: ${adminEmail}`);
  }
}

async function runStabilityMigration() {
  await repairDuplicateBusinessKeys();
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_records_active_order_folio
      ON records (lower(data->>'folio'))
      WHERE type = 'order' AND archived = FALSE AND COALESCE(data->>'folio', '') <> '';

    CREATE UNIQUE INDEX IF NOT EXISTS uq_records_active_order_tracking
      ON records ((data->>'trackingCode'))
      WHERE type = 'order' AND archived = FALSE AND COALESCE(data->>'trackingCode', '') <> '';

    CREATE UNIQUE INDEX IF NOT EXISTS uq_records_active_purchase_folio
      ON records (lower(data->>'folio'))
      WHERE type = 'purchase' AND archived = FALSE AND COALESCE(data->>'folio', '') <> '';
  `);
  await createProfessionalSchema();
  await syncAllNormalizedTables();
  await createProfessionalConstraints();
}

async function createProfessionalSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY DEFAULT 'settings',
      business_name TEXT,
      business_phone TEXT,
      business_address TEXT,
      whatsapp_template TEXT,
      theme JSONB NOT NULL DEFAULT '{}'::jsonb,
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    DROP INDEX IF EXISTS uq_clients_phone_active;

    CREATE INDEX IF NOT EXISTS idx_clients_phone_active
      ON clients (regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'))
      WHERE archived = FALSE AND regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') <> '';

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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements (item_id);

    CREATE TABLE IF NOT EXISTS audit_entries (
      id TEXT PRIMARY KEY,
      type TEXT,
      detail TEXT,
      ref_id TEXT,
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TEXT NOT NULL
    );
  `);
}

async function repairDuplicateBusinessKeys() {
  const repairedOrders = await repairDuplicatesForType("order", [
    {
      name: "folio",
      get: (data) => data.folio,
      set: (data, value) => ({ ...data, folio: value })
    },
    {
      name: "trackingCode",
      get: (data) => data.trackingCode,
      set: (data, value) => ({ ...data, trackingCode: value })
    }
  ]);
  const repairedPurchases = await repairDuplicatesForType("purchase", [
    {
      name: "folio",
      get: (data) => data.folio,
      set: (data, value) => ({ ...data, folio: value })
    }
  ]);
  if (repairedOrders + repairedPurchases > 0) {
    await audit(null, "stability_migration", "records", "", `${repairedOrders + repairedPurchases} duplicado(s) reparados`);
  }
}

async function repairDuplicatesForType(type, fields) {
  const result = await query(
    "SELECT * FROM records WHERE type = $1 AND archived = FALSE ORDER BY created_at ASC, updated_at ASC",
    [type]
  );
  const rows = result.rows.map(normalizeRecord);
  let changed = 0;
  for (const field of fields) {
    const seen = new Set();
    for (const row of rows) {
      const currentValue = String(field.get(row.data) || "").trim();
      if (!currentValue) continue;
      let candidate = currentValue;
      let key = normalizeKey(candidate);
      if (!seen.has(key)) {
        seen.add(key);
        continue;
      }
      let consecutive = 2;
      do {
        candidate = appendConsecutive(currentValue, consecutive);
        key = normalizeKey(candidate);
        consecutive += 1;
      } while (seen.has(key));
      row.data = field.set(row.data, candidate);
      seen.add(key);
      changed += 1;
      await query(
        "UPDATE records SET data = $1, updated_at = $2 WHERE id = $3 AND type = $4",
        [JSON.stringify(row.data), now(), row.id, type]
      );
    }
  }
  return changed;
}

async function syncAllNormalizedTables() {
  await clearNormalizedProjection();
  const result = await query("SELECT * FROM records ORDER BY created_at ASC, updated_at ASC");
  for (const row of result.rows.map(normalizeRecord)) {
    await syncNormalizedRecord(row.type, row.data, row.archived, row.created_at, row.updated_at);
  }
}

async function clearNormalizedProjection() {
  await query(`
    DELETE FROM order_parts;
    DELETE FROM purchase_items;
    DELETE FROM payments;
    DELETE FROM appointments;
    DELETE FROM warranty_claims;
    DELETE FROM inventory_movements;
    DELETE FROM audit_entries;
    DELETE FROM purchases;
    DELETE FROM service_orders;
    DELETE FROM inventory_items;
    DELETE FROM suppliers;
    DELETE FROM clients;
    DELETE FROM app_settings;
  `);
}

async function createProfessionalConstraints() {
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_service_orders_folio_active
      ON service_orders (lower(folio))
      WHERE archived = FALSE;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_service_orders_tracking_active
      ON service_orders (tracking_code)
      WHERE archived = FALSE AND COALESCE(tracking_code, '') <> '';

    CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_folio_active
      ON purchases (lower(folio))
      WHERE archived = FALSE;
  `);
}

async function syncNormalizedRecord(type, data, archived = false, createdAt = now(), updatedAt = now()) {
  if (!data?.id && type !== "settings") return;
  const created = data.createdAt || createdAt || now();
  const updated = data.updatedAt || updatedAt || created;
  if (type === "settings") {
    await query(
      `INSERT INTO app_settings (id,business_name,business_phone,business_address,whatsapp_template,theme,raw_data,updated_at)
       VALUES ('settings',$1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        business_phone = EXCLUDED.business_phone,
        business_address = EXCLUDED.business_address,
        whatsapp_template = EXCLUDED.whatsapp_template,
        theme = EXCLUDED.theme,
        raw_data = EXCLUDED.raw_data,
        updated_at = EXCLUDED.updated_at`,
      [data.businessName || "", data.businessPhone || "", data.businessAddress || "", data.whatsappTemplate || "", asJson(data.theme, {}), JSON.stringify(data), updated]
    );
    return;
  }
  if (type === "client") {
    await query(
      `INSERT INTO clients (id,name,phone,email,address,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email, address = EXCLUDED.address,
        archived = EXCLUDED.archived, raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [data.id, data.name || "Cliente", data.phone || "", data.email || "", data.address || "", Boolean(archived || data.archived), JSON.stringify(data), created, updated]
    );
    return;
  }
  if (type === "supplier") {
    await query(
      `INSERT INTO suppliers (id,name,contact,phone,email,category,notes,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, contact = EXCLUDED.contact, phone = EXCLUDED.phone, email = EXCLUDED.email,
        category = EXCLUDED.category, notes = EXCLUDED.notes, archived = EXCLUDED.archived,
        raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [data.id, data.name || "Proveedor", data.contact || "", data.phone || "", data.email || "", data.category || "", data.notes || "", Boolean(archived || data.archived), JSON.stringify(data), created, updated]
    );
    return;
  }
  if (type === "inventory") {
    await query(
      `INSERT INTO inventory_items (id,brand,model,name,category,stock,min_stock,cost,subdealer_price,price,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
        brand = EXCLUDED.brand, model = EXCLUDED.model, name = EXCLUDED.name, category = EXCLUDED.category,
        stock = EXCLUDED.stock, min_stock = EXCLUDED.min_stock, cost = EXCLUDED.cost,
        subdealer_price = EXCLUDED.subdealer_price, price = EXCLUDED.price, archived = EXCLUDED.archived,
        raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [
        data.id, data.brand || "", data.model || "", data.name || [data.brand, data.model].filter(Boolean).join(" ") || "Articulo",
        data.category || "", Math.max(0, asNumber(data.stock)), Math.max(0, asNumber(data.min ?? data.minStock ?? 1)),
        Math.max(0, asNumber(data.cost)), Math.max(0, asNumber(data.subdealerPrice)), Math.max(0, asNumber(data.price)),
        Boolean(archived || data.archived), JSON.stringify(data), created, updated
      ]
    );
    return;
  }
  if (type === "order") {
    await query(
      `INSERT INTO service_orders (id,folio,tracking_code,client_id,device,technician,serial,status,issue,notes,accessories,physical_state,total,deposit,paid,warranty_days,warranty_terms,approved,quote_part_name,quote_supplier_id,archived,status_history,status_evidence_photos,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       ON CONFLICT (id) DO UPDATE SET
        folio = EXCLUDED.folio, tracking_code = EXCLUDED.tracking_code, client_id = EXCLUDED.client_id,
        device = EXCLUDED.device, technician = EXCLUDED.technician, serial = EXCLUDED.serial, status = EXCLUDED.status,
        issue = EXCLUDED.issue, notes = EXCLUDED.notes, accessories = EXCLUDED.accessories, physical_state = EXCLUDED.physical_state,
        total = EXCLUDED.total, deposit = EXCLUDED.deposit, paid = EXCLUDED.paid, warranty_days = EXCLUDED.warranty_days,
        warranty_terms = EXCLUDED.warranty_terms, approved = EXCLUDED.approved, quote_part_name = EXCLUDED.quote_part_name,
        quote_supplier_id = EXCLUDED.quote_supplier_id, archived = EXCLUDED.archived, status_history = EXCLUDED.status_history,
        status_evidence_photos = EXCLUDED.status_evidence_photos, raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [
        data.id, data.folio || data.id, data.trackingCode || "", data.clientId || "", data.device || "Equipo",
        data.technician || "", data.serial || "", data.status || "Recibido", data.issue || "", data.notes || "",
        data.accessories || "", data.physicalState || "", Math.max(0, asNumber(data.total)), Math.max(0, asNumber(data.deposit)),
        Boolean(data.paid), Math.max(0, Number(data.warrantyDays || 90)), data.warrantyTerms || "", Boolean(data.approved),
        data.quotePartName || "", data.quoteSupplierId || "", Boolean(archived || data.archived), asJson(data.statusHistory),
        asJson(data.statusEvidencePhotos), JSON.stringify(data), created, updated
      ]
    );
    await query("DELETE FROM order_parts WHERE order_id = $1", [data.id]);
    const suppliedParts = Array.isArray(data.suppliedParts) ? data.suppliedParts : [];
    for (const part of suppliedParts) {
      await query(
        `INSERT INTO order_parts (id,order_id,inventory_id,purchase_id,purchase_item_id,part_name,qty,cost,total_cost,raw_data,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
          inventory_id = EXCLUDED.inventory_id, purchase_id = EXCLUDED.purchase_id, purchase_item_id = EXCLUDED.purchase_item_id,
          part_name = EXCLUDED.part_name, qty = EXCLUDED.qty, cost = EXCLUDED.cost, total_cost = EXCLUDED.total_cost,
          raw_data = EXCLUDED.raw_data`,
        [
          part.id || id("op"), data.id, part.inventoryId || "", part.purchaseId || "", part.purchaseItemId || "",
          part.part || "Refaccion", Math.max(0.01, asNumber(part.qty || 1)), Math.max(0, asNumber(part.cost)),
          Math.max(0, asNumber(part.totalCost ?? asNumber(part.qty || 1) * asNumber(part.cost))), JSON.stringify(part),
          part.createdAt || updated
        ]
      );
    }
    return;
  }
  if (type === "purchase") {
    await query(
      `INSERT INTO purchases (id,folio,supplier_id,order_id,part,qty,cost,status,notes,received_at,received_quantities,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
        folio = EXCLUDED.folio, supplier_id = EXCLUDED.supplier_id, order_id = EXCLUDED.order_id, part = EXCLUDED.part,
        qty = EXCLUDED.qty, cost = EXCLUDED.cost, status = EXCLUDED.status, notes = EXCLUDED.notes,
        received_at = EXCLUDED.received_at, received_quantities = EXCLUDED.received_quantities,
        archived = EXCLUDED.archived, raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [
        data.id, data.folio || data.id, data.supplierId || "", data.orderId || "", data.part || "",
        Math.max(0, asNumber(data.qty || 1)), Math.max(0, asNumber(data.cost)), data.status || "Cotizando",
        data.notes || "", data.receivedAt || "", asJson(data.receivedQuantities, {}), Boolean(archived || data.archived),
        JSON.stringify(data), created, updated
      ]
    );
    await query("DELETE FROM purchase_items WHERE purchase_id = $1", [data.id]);
    const items = Array.isArray(data.items) && data.items.length ? data.items : [{ id: id("pitem"), part: data.part, qty: data.qty, cost: data.cost }];
    for (const item of items.filter((entry) => entry?.part)) {
      await query(
        `INSERT INTO purchase_items (id,purchase_id,part,qty,cost,raw_data)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET part = EXCLUDED.part, qty = EXCLUDED.qty, cost = EXCLUDED.cost, raw_data = EXCLUDED.raw_data`,
        [item.id || id("pitem"), data.id, item.part, Math.max(0.01, asNumber(item.qty || 1)), Math.max(0, asNumber(item.cost)), JSON.stringify(item)]
      );
    }
    return;
  }
  if (type === "payment") {
    await query(
      `INSERT INTO payments (id,order_id,amount,method,reference,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
        order_id = EXCLUDED.order_id, amount = EXCLUDED.amount, method = EXCLUDED.method, reference = EXCLUDED.reference,
        archived = EXCLUDED.archived, raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [data.id, data.orderId || "", Math.max(0, asNumber(data.amount)), data.method || "", data.reference || "", Boolean(archived || data.archived), JSON.stringify(data), created, updated]
    );
    return;
  }
  if (type === "appointment") {
    await query(
      `INSERT INTO appointments (id,client_id,order_id,date,time,type,notes,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
        client_id = EXCLUDED.client_id, order_id = EXCLUDED.order_id, date = EXCLUDED.date, time = EXCLUDED.time,
        type = EXCLUDED.type, notes = EXCLUDED.notes, archived = EXCLUDED.archived, raw_data = EXCLUDED.raw_data,
        updated_at = EXCLUDED.updated_at`,
      [data.id, data.clientId || "", data.orderId || "", data.date || "", data.time || "", data.type || "", data.notes || "", Boolean(archived || data.archived), JSON.stringify(data), created, updated]
    );
    return;
  }
  if (type === "warrantyClaim") {
    await query(
      `INSERT INTO warranty_claims (id,order_id,reason,resolution,status,cost,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
        order_id = EXCLUDED.order_id, reason = EXCLUDED.reason, resolution = EXCLUDED.resolution, status = EXCLUDED.status,
        cost = EXCLUDED.cost, archived = EXCLUDED.archived, raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [data.id, data.orderId || "", data.reason || "", data.resolution || "", data.status || "", Math.max(0, asNumber(data.cost)), Boolean(archived || data.archived), JSON.stringify(data), created, updated]
    );
    return;
  }
  if (type === "inventoryMovement") {
    await query(
      `INSERT INTO inventory_movements (id,item_id,item_name,qty,type,detail,ref_id,raw_data,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
        item_id = EXCLUDED.item_id, item_name = EXCLUDED.item_name, qty = EXCLUDED.qty, type = EXCLUDED.type,
        detail = EXCLUDED.detail, ref_id = EXCLUDED.ref_id, raw_data = EXCLUDED.raw_data`,
      [data.id, data.itemId || "", data.itemName || "", asNumber(data.qty), data.type || "", data.detail || "", data.refId || "", JSON.stringify(data), created]
    );
    return;
  }
  if (type === "auditEntry") {
    await query(
      `INSERT INTO audit_entries (id,type,detail,ref_id,raw_data,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, detail = EXCLUDED.detail, ref_id = EXCLUDED.ref_id, raw_data = EXCLUDED.raw_data`,
      [data.id, data.type || "", data.detail || "", data.refId || "", JSON.stringify(data), created]
    );
  }
}

async function audit(userId, action, recordType, recordId, detail = "") {
  await query(
    "INSERT INTO audit_log (id,user_id,action,record_type,record_id,detail,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id("aud"), userId || null, action, recordType || null, recordId || null, detail, now()]
  );
}

async function prepareRecordForSave(type, requestedId, record) {
  const data = { ...record };
  let recordId = requestedId || data.id || id(type.slice(0, 3));
  recordId = await resolveRecordId(type, recordId);
  data.id = recordId;

  if (type === "order") {
    if (data.folio) data.folio = await resolveUniqueJsonField(type, recordId, "folio", data.folio);
    if (data.trackingCode) data.trackingCode = await resolveUniqueJsonField(type, recordId, "trackingCode", data.trackingCode);
  }
  if (type === "purchase" && data.folio) {
    data.folio = await resolveUniqueJsonField(type, recordId, "folio", data.folio);
  }
  return { recordId, data };
}

async function resolveRecordId(type, requestedId) {
  const baseId = String(requestedId || id(type.slice(0, 3))).trim();
  let candidate = baseId;
  let consecutive = 2;
  while (true) {
    const existing = await query("SELECT id,type FROM records WHERE id = $1 LIMIT 1", [candidate]);
    if (!existing.rows.length || existing.rows[0].type === type) return candidate;
    candidate = appendConsecutive(baseId, consecutive);
    consecutive += 1;
  }
}

async function resolveUniqueJsonField(type, recordId, field, value) {
  const jsonField = safeJsonField(field);
  const baseValue = String(value || "").trim();
  if (!baseValue) return baseValue;
  let candidate = baseValue;
  let consecutive = 2;
  while (true) {
    const existing = await query(
      `SELECT id FROM records WHERE type = $1 AND archived = FALSE AND lower(data->>'${jsonField}') = lower($2) AND id <> $3 LIMIT 1`,
      [type, candidate, recordId]
    );
    if (!existing.rows.length) return candidate;
    candidate = appendConsecutive(baseValue, consecutive);
    consecutive += 1;
  }
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    jwtSecret,
    { expiresIn: "12h" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Token invalido o expirado" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: "Permiso insuficiente" });
    next();
  };
}

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "12mb" }));

app.get(["/", "/health", "/api/health"], (_req, res) => res.json({
  ok: true,
  service: "PCFix backend",
  mode: "postgres",
  login: "/api/auth/login",
  health: "/api/health",
  stability: "/api/stability",
  at: now()
}));

app.get("/api/stability", async (_req, res) => {
  const report = await getStabilityReport();
  res.json({
    ok: report.ok,
    service: "PCFix backend",
    mode: "postgres",
    professionalDatabase: true,
    restrictions: report.restrictions,
    protectedReports: {
      analytics: "/api/admin/analytics",
      integrity: "/api/admin/integrity",
      stability: "/api/admin/stability"
    },
    totals: report.totals,
    normalizedTotals: report.normalizedTotals,
    duplicates: report.duplicates,
    adminRepair: "/api/admin/stability/repair"
  });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const result = await query("SELECT * FROM users WHERE email = $1 AND active = TRUE", [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(req.body?.password || ""), user.password_hash))) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }
  await audit(user.id, "login", "user", user.id, "Inicio de sesion");
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/public/orders/:folio", async (req, res) => {
  const folio = String(req.params.folio || "").toLowerCase();
  const trackingCode = String(req.query.code || "").trim();
  const result = trackingCode
    ? await query(
        "SELECT * FROM records WHERE type = $1 AND archived = FALSE AND lower(data->>'folio') = $2 AND data->>'trackingCode' = $3 ORDER BY updated_at DESC LIMIT 1",
        ["order", folio, trackingCode]
      )
    : await query(
        "SELECT * FROM records WHERE type = $1 AND archived = FALSE AND lower(data->>'folio') = $2 ORDER BY updated_at DESC LIMIT 1",
        ["order", folio]
      );
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: "Orden no encontrada" });
  const order = normalizeRecord(row).data;
  const clientResult = await query(
    "SELECT * FROM records WHERE type = $1 AND id = $2 AND archived = FALSE LIMIT 1",
    ["client", order.clientId]
  );
  const client = clientResult.rows[0] ? normalizeRecord(clientResult.rows[0]).data : null;
  res.json({
    order: {
      folio: order.folio,
      status: order.status,
      device: order.device,
      issue: order.issue,
      notes: order.notes,
      physicalState: order.physicalState,
      warrantyDays: order.warrantyDays,
      warrantyTerms: order.warrantyTerms,
      total: order.total,
      deposit: order.deposit,
      trackingCode: order.trackingCode,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      statusHistory: order.statusHistory || [],
      statusEvidencePhotos: order.statusEvidencePhotos || []
    },
    client: { name: client?.name || "Cliente" }
  });
});

app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));

app.get("/api/records/:type", requireAuth, async (req, res) => {
  const { type } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  const includeArchived = req.query.archived === "1";
  const result = await query(
    `SELECT * FROM records WHERE type = $1 ${includeArchived ? "" : "AND archived = FALSE"} ORDER BY updated_at DESC`,
    [type]
  );
  res.json(result.rows.map(normalizeRecord));
});

app.post("/api/records/:type", requireAuth, requireRole("admin", "manager", "technician"), async (req, res) => {
  const { type } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  const record = req.body?.data || {};
  const prepared = await prepareRecordForSave(type, req.body?.id || record.id, record);
  const { recordId, data } = prepared;
  const timestamp = now();
  const existing = await query("SELECT id FROM records WHERE id = $1", [recordId]);
  try {
    await query(
      `INSERT INTO records (id,type,data,archived,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, archived = EXCLUDED.archived, updated_at = EXCLUDED.updated_at`,
      [recordId, type, JSON.stringify(data), Boolean(record.archived), timestamp, timestamp]
    );
    await syncNormalizedRecord(type, data, Boolean(record.archived), timestamp, timestamp);
  } catch (error) {
    if (error?.code !== "23505") throw error;
    const retry = await prepareRecordForSave(type, appendConsecutive(recordId, 2), data);
    await query(
      `INSERT INTO records (id,type,data,archived,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, archived = EXCLUDED.archived, updated_at = EXCLUDED.updated_at`,
      [retry.recordId, type, JSON.stringify(retry.data), Boolean(record.archived), timestamp, timestamp]
    );
    await syncNormalizedRecord(type, retry.data, Boolean(record.archived), timestamp, timestamp);
    await audit(req.user.sub, "dedupe_save", type, retry.recordId, `Conflicto unico resuelto desde ${recordId}`);
    return res.status(201).json({ id: retry.recordId, data: retry.data, deduped: true });
  }
  await audit(req.user.sub, existing.rows.length ? "update" : "create", type, recordId, req.body?.detail || "");
  res.status(existing.rows.length ? 200 : 201).json({ id: recordId, data, deduped: recordId !== (req.body?.id || record.id) });
});

app.post("/api/records/:type/:id/archive", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const { type, id: recordId } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  await query("UPDATE records SET archived = TRUE, updated_at = $1 WHERE id = $2 AND type = $3", [now(), recordId, type]);
  const archived = await query("SELECT * FROM records WHERE id = $1 AND type = $2 LIMIT 1", [recordId, type]);
  if (archived.rows[0]) {
    await syncNormalizedRecord(type, normalizeRecord(archived.rows[0]).data, true, archived.rows[0].created_at, now());
  }
  await audit(req.user.sub, "archive", type, recordId, req.body?.detail || "");
  res.json({ ok: true });
});

app.get("/api/audit", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  const result = await query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 250");
  res.json(result.rows);
});

app.get("/api/admin/stability", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  res.json(await getStabilityReport());
});

app.get("/api/admin/analytics", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  res.json(await getAnalyticsReport());
});

app.get("/api/admin/integrity", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  res.json(await getIntegrityReport());
});

app.post("/api/admin/stability/repair", requireAuth, requireRole("admin"), async (req, res) => {
  await repairDuplicateBusinessKeys();
  await audit(req.user.sub, "manual_stability_repair", "records", "", "Reparacion manual de duplicados");
  res.json(await getStabilityReport());
});

async function getStabilityReport() {
  const [ordersFolio, ordersTracking, purchasesFolio, totals, normalizedTotals] = await Promise.all([
    findDuplicateJsonValues("order", "folio"),
    findDuplicateJsonValues("order", "trackingCode"),
    findDuplicateJsonValues("purchase", "folio"),
    query("SELECT type, COUNT(*)::int AS total FROM records WHERE archived = FALSE GROUP BY type ORDER BY type"),
    getNormalizedTotals()
  ]);
  return {
    ok: !ordersFolio.length && !ordersTracking.length && !purchasesFolio.length,
    restrictions: [
      "orden.folio unico en ordenes activas",
      "orden.trackingCode unico en ordenes activas",
      "compra.folio unico en compras activas",
      "id primario unico global en records",
      "tablas profesionales sincronizadas por modulo"
    ],
    duplicates: {
      orderFolio: ordersFolio,
      orderTrackingCode: ordersTracking,
      purchaseFolio: purchasesFolio
    },
    totals: totals.rows,
    normalizedTotals
  };
}

async function getNormalizedTotals() {
  const tables = [
    "clients",
    "suppliers",
    "inventory_items",
    "service_orders",
    "order_parts",
    "purchases",
    "purchase_items",
    "payments",
    "appointments",
    "warranty_claims",
    "inventory_movements",
    "audit_entries"
  ];
  const totals = [];
  for (const table of tables) {
    const result = await query(`SELECT COUNT(*)::int AS total FROM ${table}`);
    totals.push({ table, total: result.rows[0]?.total || 0 });
  }
  return totals;
}

async function getAnalyticsReport() {
  const [
    orderMetrics,
    financeMetrics,
    inventoryMetrics,
    purchaseMetrics,
    warrantyMetrics,
    statusRows,
    serviceRows,
    monthlyRows
  ] = await Promise.all([
    query(`
      SELECT
        COUNT(*) FILTER (WHERE archived = FALSE AND status NOT IN ('Entregado','Cancelado'))::int AS active_orders,
        COUNT(*) FILTER (WHERE archived = FALSE AND status = 'Listo')::int AS ready_orders,
        COUNT(*) FILTER (WHERE archived = FALSE AND status = 'Entregado')::int AS delivered_orders,
        COUNT(*) FILTER (WHERE archived = FALSE AND status = 'Cancelado')::int AS canceled_orders
      FROM service_orders
    `),
    query(`
      WITH order_costs AS (
        SELECT order_id, COALESCE(SUM(total_cost), 0) AS parts_cost
        FROM order_parts
        GROUP BY order_id
      ),
      payment_totals AS (
        SELECT order_id, COALESCE(SUM(amount), 0) AS payments
        FROM payments
        WHERE archived = FALSE
        GROUP BY order_id
      )
      SELECT
        COALESCE(SUM(o.total), 0) AS revenue,
        COALESCE(SUM(COALESCE(c.parts_cost, 0)), 0) AS parts_cost,
        COALESCE(SUM(o.total - COALESCE(c.parts_cost, 0)), 0) AS gross_margin,
        COALESCE(SUM(GREATEST(o.total - GREATEST(o.deposit, COALESCE(p.payments, 0)), 0)), 0) AS receivables
      FROM service_orders o
      LEFT JOIN order_costs c ON c.order_id = o.id
      LEFT JOIN payment_totals p ON p.order_id = o.id
      WHERE o.archived = FALSE AND o.status <> 'Cancelado'
    `),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE archived = FALSE AND stock <= min_stock)::int AS low_stock,
        COUNT(*) FILTER (WHERE archived = FALSE AND stock = 0)::int AS out_of_stock,
        COALESCE(SUM(stock * cost) FILTER (WHERE archived = FALSE), 0) AS inventory_value
      FROM inventory_items
    `),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE archived = FALSE AND status NOT IN ('Recibido','Cancelado'))::int AS pending_purchases,
        COALESCE(SUM(qty * cost) FILTER (WHERE archived = FALSE AND status NOT IN ('Recibido','Cancelado')), 0) AS pending_purchase_value
      FROM purchases
    `),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE archived = FALSE)::int AS warranty_claims,
        COALESCE(SUM(cost) FILTER (WHERE archived = FALSE), 0) AS warranty_cost
      FROM warranty_claims
    `),
    query(`
      SELECT status, COUNT(*)::int AS total
      FROM service_orders
      WHERE archived = FALSE
      GROUP BY status
      ORDER BY total DESC, status ASC
    `),
    query(`
      SELECT
        CASE
          WHEN lower(device) LIKE '%iphone%' OR lower(device) LIKE '%samsung%' OR lower(device) LIKE '%xiaomi%' OR lower(device) LIKE '%motorola%' THEN 'Celular'
          WHEN lower(device) LIKE '%laptop%' OR lower(device) LIKE '%thinkpad%' OR lower(device) LIKE '%hp%' OR lower(device) LIKE '%dell%' OR lower(device) LIKE '%lenovo%' THEN 'Laptop'
          WHEN lower(device) LIKE '%ipad%' OR lower(device) LIKE '%tablet%' THEN 'Tablet'
          ELSE 'Otros'
        END AS service_type,
        COUNT(*)::int AS total
      FROM service_orders
      WHERE archived = FALSE
      GROUP BY service_type
      ORDER BY total DESC
    `),
    query(`
      SELECT substring(created_at, 1, 7) AS month, COALESCE(SUM(total), 0) AS revenue, COUNT(*)::int AS orders
      FROM service_orders
      WHERE archived = FALSE AND status <> 'Cancelado'
      GROUP BY substring(created_at, 1, 7)
      ORDER BY month DESC
      LIMIT 12
    `)
  ]);
  const finance = financeMetrics.rows[0] || {};
  const marginRate = asNumber(finance.revenue) > 0
    ? Math.round((asNumber(finance.gross_margin) / asNumber(finance.revenue)) * 100)
    : 0;
  return {
    generatedAt: now(),
    kpis: {
      ...(orderMetrics.rows[0] || {}),
      revenue: asNumber(finance.revenue),
      partsCost: asNumber(finance.parts_cost),
      grossMargin: asNumber(finance.gross_margin),
      marginRate,
      receivables: asNumber(finance.receivables),
      lowStock: inventoryMetrics.rows[0]?.low_stock || 0,
      outOfStock: inventoryMetrics.rows[0]?.out_of_stock || 0,
      inventoryValue: asNumber(inventoryMetrics.rows[0]?.inventory_value),
      pendingPurchases: purchaseMetrics.rows[0]?.pending_purchases || 0,
      pendingPurchaseValue: asNumber(purchaseMetrics.rows[0]?.pending_purchase_value),
      warrantyClaims: warrantyMetrics.rows[0]?.warranty_claims || 0,
      warrantyCost: asNumber(warrantyMetrics.rows[0]?.warranty_cost)
    },
    statusDistribution: statusRows.rows,
    serviceMix: serviceRows.rows,
    monthlyRevenue: monthlyRows.rows.reverse(),
    recommendations: buildAnalyticsRecommendations({
      marginRate,
      receivables: asNumber(finance.receivables),
      lowStock: inventoryMetrics.rows[0]?.low_stock || 0,
      pendingPurchases: purchaseMetrics.rows[0]?.pending_purchases || 0,
      warrantyCost: asNumber(warrantyMetrics.rows[0]?.warranty_cost)
    })
  };
}

function buildAnalyticsRecommendations(metrics) {
  const recommendations = [];
  if (metrics.receivables > 0) recommendations.push("Revisar cuentas por cobrar y enviar recordatorios de liquidacion.");
  if (metrics.lowStock > 0) recommendations.push("Priorizar reabastecimiento de articulos en minimo o agotados.");
  if (metrics.pendingPurchases > 0) recommendations.push("Cerrar compras pendientes para reducir ordenes detenidas por refacciones.");
  if (metrics.marginRate > 0 && metrics.marginRate < 30) recommendations.push("Revisar precios de venta: el margen general esta por debajo de 30%.");
  if (metrics.warrantyCost > 0) recommendations.push("Analizar garantias con costo absorbido para detectar fallas repetitivas.");
  return recommendations;
}

async function getIntegrityReport() {
  const checks = [
    {
      key: "ordersWithoutClient",
      label: "Ordenes sin cliente valido",
      sql: "SELECT COUNT(*)::int AS total FROM service_orders o LEFT JOIN clients c ON c.id = o.client_id WHERE o.archived = FALSE AND COALESCE(o.client_id, '') <> '' AND c.id IS NULL"
    },
    {
      key: "paymentsWithoutOrder",
      label: "Pagos sin orden valida",
      sql: "SELECT COUNT(*)::int AS total FROM payments p LEFT JOIN service_orders o ON o.id = p.order_id WHERE p.archived = FALSE AND COALESCE(p.order_id, '') <> '' AND o.id IS NULL"
    },
    {
      key: "purchasesWithoutSupplier",
      label: "Compras sin proveedor valido",
      sql: "SELECT COUNT(*)::int AS total FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.archived = FALSE AND COALESCE(p.supplier_id, '') <> '' AND s.id IS NULL"
    },
    {
      key: "purchasesWithoutOrder",
      label: "Compras ligadas a orden inexistente",
      sql: "SELECT COUNT(*)::int AS total FROM purchases p LEFT JOIN service_orders o ON o.id = p.order_id WHERE p.archived = FALSE AND COALESCE(p.order_id, '') <> '' AND o.id IS NULL"
    },
    {
      key: "orderPartsWithoutOrder",
      label: "Refacciones surtidas sin orden",
      sql: "SELECT COUNT(*)::int AS total FROM order_parts op LEFT JOIN service_orders o ON o.id = op.order_id WHERE o.id IS NULL"
    },
    {
      key: "orderPartsWithoutInventory",
      label: "Refacciones surtidas sin articulo de inventario",
      sql: "SELECT COUNT(*)::int AS total FROM order_parts op LEFT JOIN inventory_items i ON i.id = op.inventory_id WHERE COALESCE(op.inventory_id, '') <> '' AND i.id IS NULL"
    },
    {
      key: "negativeBusinessValues",
      label: "Valores negativos bloqueados por reglas",
      sql: "SELECT 0::int AS total"
    }
  ];
  const results = [];
  for (const check of checks) {
    const result = await query(check.sql);
    results.push({ key: check.key, label: check.label, total: result.rows[0]?.total || 0 });
  }
  return {
    ok: results.every((item) => item.total === 0),
    generatedAt: now(),
    checks: results,
    recommendations: results
      .filter((item) => item.total > 0)
      .map((item) => `Corregir ${item.total} caso(s): ${item.label}.`)
  };
}

async function findDuplicateJsonValues(type, field) {
  const jsonField = safeJsonField(field);
  const result = await query(
    `SELECT data->>'${jsonField}' AS value, COUNT(*)::int AS total
     FROM records
     WHERE type = $1 AND archived = FALSE AND COALESCE(data->>'${jsonField}', '') <> ''
     GROUP BY data->>'${jsonField}'
     HAVING COUNT(*) > 1
     ORDER BY total DESC, value ASC`,
    [type]
  );
  return result.rows;
}

app.get("/api/users", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  const result = await query("SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC");
  res.json(result.rows.map((row) => ({ ...row, active: Boolean(row.active), createdAt: row.created_at })));
});

app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role = "technician" } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Nombre, email y password son requeridos" });
  if (!["admin", "manager", "technician", "viewer"].includes(role)) return res.status(400).json({ error: "Rol invalido" });
  const userId = id("usr");
  try {
    await query(
      "INSERT INTO users (id,name,email,password_hash,role,active,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [userId, name, String(email).toLowerCase(), await bcrypt.hash(password, 12), role, true, now()]
    );
    await audit(req.user.sub, "create_user", "user", userId, email);
    res.status(201).json({ id: userId, name, email: String(email).toLowerCase(), role, active: true });
  } catch {
    res.status(409).json({ error: "Email ya registrado" });
  }
});

app.post("/api/users/:id/deactivate", requireAuth, requireRole("admin"), async (req, res) => {
  await query("UPDATE users SET active = FALSE WHERE id = $1", [req.params.id]);
  await audit(req.user.sub, "deactivate_user", "user", req.params.id, "");
  res.json({ ok: true });
});

app.post("/api/files/base64", requireAuth, requireRole("admin", "manager", "technician"), (_req, res) => {
  res.status(501).json({ error: "Usa evidencia embebida en ordenes o configura storage externo." });
});

app.get("/api/whatsapp/webhook", (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";
  if (req.query["hub.verify_token"] === verifyToken) return res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  const payload = req.body || {};
  const messages = payload.entry?.flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.messages || []) || [];
  for (const message of messages) {
    await query(
      "INSERT INTO whatsapp_messages (id,direction,phone,text,payload,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id("wam"), "in", message.from || "", message.text?.body || "", JSON.stringify(message), "received", now()]
    );
  }
  res.json({ ok: true });
});

app.get("/api/whatsapp/status", requireAuth, requireRole("admin", "manager", "technician"), (_req, res) => {
  res.json({
    configured: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? "configurado" : "faltante",
    token: process.env.WHATSAPP_TOKEN ? "configurado" : "faltante"
  });
});

app.get("/api/whatsapp/messages", requireAuth, requireRole("admin", "manager", "technician"), async (_req, res) => {
  const result = await query(
    "SELECT id,direction,phone,text,payload,status,created_at FROM whatsapp_messages ORDER BY created_at DESC LIMIT 20"
  );
  res.json(result.rows);
});

app.post("/api/whatsapp/send", requireAuth, requireRole("admin", "manager", "technician"), async (req, res) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const { to, text } = req.body || {};
  if (!token || !phoneNumberId) return res.status(400).json({ error: "Configura WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID" });
  const normalizedTo = String(to || "").replace(/\D/g, "");
  if (!/^\d{11,15}$/.test(normalizedTo)) return res.status(400).json({ error: "Telefono WhatsApp invalido. Usa lada pais, por ejemplo 529631234567." });
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: "text",
      text: { preview_url: false, body: String(text || "") }
    })
  });
  const payload = await response.json();
  await query(
    "INSERT INTO whatsapp_messages (id,direction,phone,text,payload,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id("wam"), "out", to, text, JSON.stringify(payload), response.ok ? "sent" : "error", now()]
  );
  await audit(req.user.sub, "whatsapp_send", "whatsapp", to, response.ok ? "Enviado" : "Error");
  if (!response.ok) {
    const metaMessage = payload?.error?.message || payload?.error?.error_user_msg || "Meta rechazo el envio de WhatsApp.";
    return res.status(502).json({
      error: metaMessage,
      meta: payload,
      hint: "Con token temporal, Meta solo envia a numeros de prueba. Para clientes reales necesitas numero aprobado y plantillas o ventana de 24 horas."
    });
  }
  res.json(payload);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Error interno" });
});

await initDb();

app.listen(port, () => {
  console.log(`PCFix backend Postgres listo en puerto ${port}`);
});
