import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { pendingQualityChecks } from "./domain.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const backendVersion = "pcfix-backend-seguridad-calidad-20260716-05";

if (!databaseUrl) {
  console.error("Falta DATABASE_URL. Configura Supabase/Neon/Postgres en Render.");
  process.exit(1);
}
if (!jwtSecret || jwtSecret.length < 32) {
  console.error("Falta JWT_SECRET o es demasiado corto. Configura al menos 32 caracteres en Render.");
  process.exit(1);
}

const sensitiveDataSecret = process.env.SENSITIVE_DATA_KEY || jwtSecret;
const sensitiveDataKey = createHash("sha256").update(sensitiveDataSecret).digest();
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const evidenceBucket = process.env.SUPABASE_EVIDENCE_BUCKET || "pcfix-evidence";
const productionCorsOrigins = String(process.env.CORS_ORIGIN || "https://pcfix-sistema.onrender.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false }
});
const transactionContext = new AsyncLocalStorage();

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

function normalizeSearchKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
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

function encryptSensitive(value) {
  const plaintext = String(value || "").trim();
  if (!plaintext) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sensitiveDataKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptSensitive(payload) {
  try {
    const [version, ivValue, tagValue, encryptedValue] = String(payload || "").split(".");
    if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) return "";
    const decipher = createDecipheriv("aes-256-gcm", sensitiveDataKey, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function storageConfigured() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function storageHeaders(extra = {}) {
  return {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
    ...extra
  };
}

function storageObjectPath(path) {
  return String(path || "").split("/").map(encodeURIComponent).join("/");
}

async function ensureEvidenceBucket() {
  if (!storageConfigured()) return false;
  const current = await fetch(`${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(evidenceBucket)}`, {
    headers: storageHeaders()
  });
  if (current.ok) return true;
  if (current.status !== 404) throw new Error(`No se pudo consultar Storage (${current.status})`);
  const created = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: evidenceBucket,
      name: evidenceBucket,
      public: false,
      file_size_limit: 3 * 1024 * 1024,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp"]
    })
  });
  if (!created.ok && created.status !== 409) throw new Error(`No se pudo crear bucket privado (${created.status})`);
  return true;
}

function decodeEvidenceDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) throw businessError("Formato de evidencia no permitido", "invalid_evidence_format", 400);
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 3 * 1024 * 1024) {
    throw businessError("Cada fotografia debe pesar menos de 3 MB", "evidence_too_large", 400);
  }
  const mime = match[1].toLowerCase();
  const validSignature = mime === "image/jpeg"
    ? buffer[0] === 0xff && buffer[1] === 0xd8
    : mime === "image/png"
      ? buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (!validSignature) throw businessError("El contenido de la fotografia no coincide con su formato", "invalid_evidence_signature", 400);
  return { buffer, mime };
}

async function uploadEvidencePhoto(orderId, photo) {
  const { buffer, mime } = decodeEvidenceDataUrl(photo.dataUrl);
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mime];
  const safeOrderId = String(orderId || "orden").replace(/[^a-z0-9_-]/gi, "_");
  const path = `orders/${safeOrderId}/${Date.now()}-${randomBytes(6).toString("hex")}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(evidenceBucket)}/${storageObjectPath(path)}`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": mime, "x-upsert": "false" }),
    body: buffer
  });
  if (!response.ok) throw businessError("No se pudo guardar evidencia en Storage", "evidence_upload_failed", 502);
  return {
    id: photo.id || id("photo"),
    name: String(photo.name || `evidencia.${extension}`).slice(0, 120),
    type: mime,
    path,
    uploadedAt: now()
  };
}

async function signEvidencePath(path, expiresIn = 900) {
  if (!storageConfigured() || !path) return "";
  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(evidenceBucket)}/${storageObjectPath(path)}`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn })
  });
  if (!response.ok) return "";
  const payload = await response.json().catch(() => ({}));
  const signed = payload.signedURL || payload.signedUrl || "";
  if (!signed) return "";
  if (/^https?:\/\//i.test(signed)) return signed;
  const storagePath = signed.startsWith("/storage/v1/") ? signed : `/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  return new URL(storagePath, supabaseUrl).href;
}

async function materializeEvidencePhotos(photos, expiresIn = 900) {
  return Promise.all((photos || []).slice(0, 12).map(async (photo) => {
    if (photo?.dataUrl) return photo;
    const url = await signEvidencePath(photo?.path, expiresIn);
    return { ...photo, url };
  }));
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
  const connection = transactionContext.getStore() || pool;
  const result = await connection.query(text, params);
  return result;
}

async function withTransaction(work) {
  if (transactionContext.getStore()) return work();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await transactionContext.run(client, work);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getStateRevision() {
  const result = await query(`
    SELECT COALESCE(MAX(marker), '') AS revision
    FROM (
      SELECT MAX(updated_at) AS marker FROM app_settings
      UNION ALL SELECT MAX(updated_at) FROM clients
      UNION ALL SELECT MAX(updated_at) FROM suppliers
      UNION ALL SELECT MAX(updated_at) FROM inventory_items
      UNION ALL SELECT MAX(updated_at) FROM service_orders
      UNION ALL SELECT MAX(updated_at) FROM purchases
      UNION ALL SELECT MAX(updated_at) FROM payments
      UNION ALL SELECT MAX(updated_at) FROM appointments
      UNION ALL SELECT MAX(updated_at) FROM warranty_claims
      UNION ALL SELECT MAX(created_at) FROM inventory_movements
      UNION ALL SELECT MAX(created_at) FROM order_approvals
      UNION ALL SELECT MAX(created_at) FROM users
    ) revisions
  `);
  return String(result.rows[0]?.revision || "");
}

function businessError(message, code = "business_rule", status = 409) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
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
  const adminPassword = process.env.ADMIN_PASSWORD;
  const existing = await query("SELECT id FROM users WHERE email = $1", [adminEmail]);
  if (!existing.rows.length) {
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error("ADMIN_PASSWORD debe configurarse con al menos 12 caracteres antes de crear el usuario inicial.");
    }
    await query(
      "INSERT INTO users (id,name,email,password_hash,role,active,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id("usr"), "Administrador PCFix", adminEmail, await bcrypt.hash(adminPassword, 12), "admin", true, now()]
    );
    console.log(`Admin inicial creado: ${adminEmail}`);
  }
}

async function runStabilityMigration() {
  await createProfessionalSchema();
  await createProfessionalForeignKeys();
  await dropLegacyOfflineTables();
  await repairProfessionalDuplicateBusinessKeys();
  await createProfessionalConstraints();
  await migrateLegacyUnlockPatterns();
  await hardenDatabaseExposure();
}

async function migrateLegacyUnlockPatterns() {
  const result = await query("SELECT id, status, raw_data FROM service_orders WHERE raw_data ? 'unlockPattern'");
  for (const row of result.rows) {
    const raw = rawObject(row);
    const plaintext = String(raw.unlockPattern || "").trim();
    delete raw.unlockPattern;
    if (plaintext && !["Entregado", "Cancelado"].includes(row.status)) {
      raw.unlockPatternEncrypted = encryptSensitive(plaintext);
    } else if (["Entregado", "Cancelado"].includes(row.status)) {
      delete raw.unlockPatternEncrypted;
    }
    await query("UPDATE service_orders SET raw_data = $1 WHERE id = $2", [JSON.stringify(raw), row.id]);
  }
}

async function hardenDatabaseExposure() {
  const tables = [
    "app_settings", "clients", "suppliers", "inventory_items", "service_orders", "order_parts",
    "purchases", "purchase_items", "payments", "appointments", "warranty_claims",
    "inventory_movements", "audit_entries", "order_approvals", "users", "audit_log", "whatsapp_messages"
  ];
  for (const table of tables) {
    await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON TABLE ${table} FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON TABLE ${table} FROM authenticated;
        END IF;
      END $$;
    `);
  }
}

async function createProfessionalForeignKeys() {
  await query(`
    UPDATE service_orders SET client_id = NULL WHERE client_id = '';
    UPDATE service_orders SET quote_supplier_id = NULL WHERE quote_supplier_id = '';
    UPDATE purchases SET supplier_id = NULL WHERE supplier_id = '';
    UPDATE purchases SET order_id = NULL WHERE order_id = '';
    UPDATE payments SET order_id = NULL WHERE order_id = '';
    UPDATE appointments SET client_id = NULL WHERE client_id = '';
    UPDATE appointments SET order_id = NULL WHERE order_id = '';
    UPDATE warranty_claims SET order_id = NULL WHERE order_id = '';
    UPDATE inventory_movements SET item_id = NULL WHERE item_id = '';
    UPDATE order_parts SET inventory_id = NULL WHERE inventory_id = '';
    UPDATE order_parts SET purchase_id = NULL WHERE purchase_id = '';
    UPDATE order_parts SET purchase_item_id = NULL WHERE purchase_item_id = '';
    UPDATE service_orders o SET client_id = NULL WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = o.client_id);
    UPDATE purchases p SET supplier_id = NULL WHERE supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = p.supplier_id);
    UPDATE purchases p SET order_id = NULL WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_orders o WHERE o.id = p.order_id);
    UPDATE payments p SET order_id = NULL WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_orders o WHERE o.id = p.order_id);
    UPDATE appointments a SET client_id = NULL WHERE client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = a.client_id);
    UPDATE appointments a SET order_id = NULL WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_orders o WHERE o.id = a.order_id);
    UPDATE warranty_claims w SET order_id = NULL WHERE order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM service_orders o WHERE o.id = w.order_id);
    UPDATE inventory_movements m SET item_id = NULL WHERE item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.id = m.item_id);
    UPDATE service_orders o SET quote_supplier_id = NULL WHERE quote_supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = o.quote_supplier_id);
    UPDATE order_parts op SET inventory_id = NULL WHERE inventory_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM inventory_items i WHERE i.id = op.inventory_id);
    UPDATE order_parts op SET purchase_id = NULL WHERE purchase_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p.id = op.purchase_id);
    UPDATE order_parts op SET purchase_item_id = NULL WHERE purchase_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM purchase_items pi WHERE pi.id = op.purchase_item_id);

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
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_quote_supplier') THEN
        ALTER TABLE service_orders ADD CONSTRAINT fk_orders_quote_supplier FOREIGN KEY (quote_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_client') THEN
        ALTER TABLE appointments ADD CONSTRAINT fk_appointments_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_order') THEN
        ALTER TABLE appointments ADD CONSTRAINT fk_appointments_order FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE SET NULL NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_parts_inventory') THEN
        ALTER TABLE order_parts ADD CONSTRAINT fk_order_parts_inventory FOREIGN KEY (inventory_id) REFERENCES inventory_items(id) ON DELETE SET NULL NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_parts_purchase') THEN
        ALTER TABLE order_parts ADD CONSTRAINT fk_order_parts_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_parts_purchase_item') THEN
        ALTER TABLE order_parts ADD CONSTRAINT fk_order_parts_purchase_item FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE SET NULL NOT VALID;
      END IF;
    END $$;
  `);
}

async function dropLegacyOfflineTables() {
  await query("DROP TABLE IF EXISTS records CASCADE");
  await query("DROP TABLE IF EXISTS files CASCADE");
  await audit(null, "drop_legacy_offline_tables", "database", "", "Tablas legacy records/files eliminadas; solo BD profesional online");
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
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
  `);
}

async function repairProfessionalDuplicateBusinessKeys() {
  const repairedOrdersFolio = await repairProfessionalDuplicates("service_orders", "folio");
  const repairedOrdersTracking = await repairProfessionalDuplicates("service_orders", "tracking_code");
  const repairedPurchasesFolio = await repairProfessionalDuplicates("purchases", "folio");
  const repaired = repairedOrdersFolio + repairedOrdersTracking + repairedPurchasesFolio;
  if (repaired > 0) {
    await audit(null, "professional_stability_migration", "professional_tables", "", `${repaired} duplicado(s) reparados`);
  }
}

async function repairProfessionalDuplicates(table, column) {
  const result = await query(
    `SELECT id, ${column} AS value, created_at, updated_at
     FROM ${table}
     WHERE archived = FALSE AND COALESCE(${column}, '') <> ''
     ORDER BY created_at ASC, updated_at ASC`
  );
  const seen = new Set();
  let changed = 0;
  for (const row of result.rows) {
    const original = String(row.value || "").trim();
    const key = normalizeKey(original);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      continue;
    }
    let consecutive = 2;
    let candidate = appendConsecutive(original, consecutive);
    while (seen.has(normalizeKey(candidate))) {
      consecutive += 1;
      candidate = appendConsecutive(original, consecutive);
    }
    await query(`UPDATE ${table} SET ${column} = $1, updated_at = $2 WHERE id = $3`, [candidate, now(), row.id]);
    seen.add(normalizeKey(candidate));
    changed += 1;
  }
  return changed;
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

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_service_orders_status') THEN
        ALTER TABLE service_orders ADD CONSTRAINT ck_service_orders_status CHECK (status IN ('Recibido','Diagnostico','Esperando pieza','En reparacion','Listo','Entregado','Cancelado')) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_service_orders_priority') THEN
        ALTER TABLE service_orders ADD CONSTRAINT ck_service_orders_priority CHECK (priority IN ('Baja','Normal','Alta','Urgente')) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_service_orders_approval') THEN
        ALTER TABLE service_orders ADD CONSTRAINT ck_service_orders_approval CHECK (approval_status IN ('Pendiente','Aprobado','Rechazado')) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_purchases_status') THEN
        ALTER TABLE purchases ADD CONSTRAINT ck_purchases_status CHECK (status IN ('Cotizando','Pedido','Recibido','Cancelado')) NOT VALID;
      END IF;
    END $$;

    ALTER TABLE service_orders VALIDATE CONSTRAINT ck_service_orders_status;
    ALTER TABLE service_orders VALIDATE CONSTRAINT ck_service_orders_priority;
    ALTER TABLE service_orders VALIDATE CONSTRAINT ck_service_orders_approval;
    ALTER TABLE purchases VALIDATE CONSTRAINT ck_purchases_status;
  `);
  const foreignKeys = [
    ["service_orders", "fk_service_orders_client"], ["purchases", "fk_purchases_supplier"],
    ["purchases", "fk_purchases_order"], ["payments", "fk_payments_order"],
    ["warranty_claims", "fk_warranties_order"], ["inventory_movements", "fk_movements_item"],
    ["service_orders", "fk_orders_quote_supplier"], ["appointments", "fk_appointments_client"],
    ["appointments", "fk_appointments_order"], ["order_parts", "fk_order_parts_inventory"],
    ["order_parts", "fk_order_parts_purchase"], ["order_parts", "fk_order_parts_purchase_item"]
  ];
  for (const [table, constraint] of foreignKeys) {
    await query(`ALTER TABLE ${table} VALIDATE CONSTRAINT ${constraint}`);
  }
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
      `INSERT INTO inventory_items (id,sku,location,brand,model,name,category,stock,min_stock,cost,subdealer_price,price,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET
        sku = EXCLUDED.sku, location = EXCLUDED.location, brand = EXCLUDED.brand, model = EXCLUDED.model,
        name = EXCLUDED.name, category = EXCLUDED.category,
        stock = EXCLUDED.stock, min_stock = EXCLUDED.min_stock, cost = EXCLUDED.cost,
        subdealer_price = EXCLUDED.subdealer_price, price = EXCLUDED.price, archived = EXCLUDED.archived,
        raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [
        data.id, data.sku || "", data.location || "", data.brand || "", data.model || "",
        data.name || [data.brand, data.model].filter(Boolean).join(" ") || "Articulo",
        data.category || "", Math.max(0, asNumber(data.stock)), Math.max(0, asNumber(data.min ?? data.minStock ?? 1)),
        Math.max(0, asNumber(data.cost)), Math.max(0, asNumber(data.subdealerPrice)), Math.max(0, asNumber(data.price)),
        Boolean(archived || data.archived), JSON.stringify(data), created, updated
      ]
    );
    return;
  }
  if (type === "order") {
    await query(
      `INSERT INTO service_orders (id,folio,tracking_code,client_id,device,technician,serial,status,priority,promised_at,approval_status,issue,notes,accessories,physical_state,total,labor_cost,deposit,paid,warranty_days,warranty_terms,approved,quote_part_name,quote_supplier_id,archived,status_history,status_evidence_photos,raw_data,created_at,updated_at,completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
       ON CONFLICT (id) DO UPDATE SET
        folio = EXCLUDED.folio, tracking_code = EXCLUDED.tracking_code, client_id = EXCLUDED.client_id,
        device = EXCLUDED.device, technician = EXCLUDED.technician, serial = EXCLUDED.serial, status = EXCLUDED.status,
        priority = EXCLUDED.priority, promised_at = EXCLUDED.promised_at, approval_status = EXCLUDED.approval_status,
        issue = EXCLUDED.issue, notes = EXCLUDED.notes, accessories = EXCLUDED.accessories, physical_state = EXCLUDED.physical_state,
        total = EXCLUDED.total, labor_cost = EXCLUDED.labor_cost, deposit = EXCLUDED.deposit, paid = EXCLUDED.paid,
        warranty_days = EXCLUDED.warranty_days,
        warranty_terms = EXCLUDED.warranty_terms, approved = EXCLUDED.approved, quote_part_name = EXCLUDED.quote_part_name,
        quote_supplier_id = EXCLUDED.quote_supplier_id, archived = EXCLUDED.archived, status_history = EXCLUDED.status_history,
        status_evidence_photos = EXCLUDED.status_evidence_photos, raw_data = EXCLUDED.raw_data,
        updated_at = EXCLUDED.updated_at, completed_at = EXCLUDED.completed_at`,
      [
        data.id, data.folio || data.id, data.trackingCode || "", data.clientId || null, data.device || "Equipo",
        data.technician || "", data.serial || "", data.status || "Recibido", data.priority || "Normal",
        data.promisedAt || "", data.approvalStatus || "Pendiente", data.issue || "", data.notes || "",
        data.accessories || "", data.physicalState || "", Math.max(0, asNumber(data.total)),
        0, Math.max(0, asNumber(data.deposit)), Boolean(data.paid),
        Math.max(0, Number(data.warrantyDays || 90)), data.warrantyTerms || "", Boolean(data.approved || data.approvalStatus === "Aprobado"),
        data.quotePartName || "", data.quoteSupplierId || null, Boolean(archived || data.archived), asJson(data.statusHistory),
        asJson(data.statusEvidencePhotos), JSON.stringify(data), created, updated,
        data.completedAt || (data.status === "Entregado" ? updated : "")
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
          part.id || id("op"), data.id, part.inventoryId || null, part.purchaseId || null, part.purchaseItemId || null,
          part.part || "Refaccion", Math.max(0.01, asNumber(part.qty || 1)), Math.max(0, asNumber(part.cost)),
          Math.max(0, asNumber(part.totalCost ?? asNumber(part.qty || 1) * asNumber(part.cost))), JSON.stringify(part),
          part.createdAt || updated
        ]
      );
    }
    await applyOrderInventoryEffects(data, Boolean(archived || data.archived), updated);
    return;
  }
  if (type === "purchase") {
    const previousPurchase = await query("SELECT status FROM purchases WHERE id = $1 FOR UPDATE", [data.id]);
    if (normalizeSearchKey(previousPurchase.rows[0]?.status) === "recibido") {
      await revertReceivedPurchaseEffects(data.id, updated);
    }
    await query(
      `INSERT INTO purchases (id,folio,supplier_id,order_id,part,qty,cost,status,notes,received_at,received_quantities,archived,raw_data,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
        folio = EXCLUDED.folio, supplier_id = EXCLUDED.supplier_id, order_id = EXCLUDED.order_id, part = EXCLUDED.part,
        qty = EXCLUDED.qty, cost = EXCLUDED.cost, status = EXCLUDED.status, notes = EXCLUDED.notes,
        received_at = EXCLUDED.received_at, received_quantities = EXCLUDED.received_quantities,
        archived = EXCLUDED.archived, raw_data = EXCLUDED.raw_data, updated_at = EXCLUDED.updated_at`,
      [
        data.id, data.folio || data.id, data.supplierId || null, data.orderId || null, data.part || "",
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
    if (!Boolean(archived || data.archived) && normalizeSearchKey(data.status) === "recibido") {
      await applyReceivedPurchaseEffects(data, updated);
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
      [data.id, data.orderId || null, Math.max(0, asNumber(data.amount)), data.method || "", data.reference || "", Boolean(archived || data.archived), JSON.stringify(data), created, updated]
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
      [data.id, data.clientId || null, data.orderId || null, data.date || "", data.time || "", data.type || "", data.notes || "", Boolean(archived || data.archived), JSON.stringify(data), created, updated]
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
      [data.id, data.orderId || null, data.reason || "", data.resolution || "", data.status || "", Math.max(0, asNumber(data.cost)), Boolean(archived || data.archived), JSON.stringify(data), created, updated]
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
      [data.id, data.itemId || null, data.itemName || "", asNumber(data.qty), data.type || "", data.detail || "", data.refId || "", JSON.stringify(data), created]
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

async function applyReceivedPurchaseEffects(purchase, timestamp = now()) {
  const items = Array.isArray(purchase.items) && purchase.items.length
    ? purchase.items
    : [{ id: "item", part: purchase.part || "Refaccion", qty: purchase.qty || 1, cost: purchase.cost || 0 }];
  const suppliedForOrder = [];
  const itemIdsForOrder = [];
  let index = 0;
  for (const item of items.filter((entry) => entry?.part)) {
    index += 1;
    const movementId = `mov_purchase_${purchase.id}_${item.id || index}`;
    const existingMovement = await query("SELECT id FROM inventory_movements WHERE id = $1 LIMIT 1", [movementId]);
    if (existingMovement.rows.length) continue;

    const part = item.part || "Refaccion";
    const qty = Math.max(1, asNumber(item.qty || 1));
    const cost = Math.max(0, asNumber(item.cost || 0));
    const partKey = normalizeSearchKey(part);
    const inventoryRows = await query("SELECT * FROM inventory_items WHERE archived = FALSE ORDER BY updated_at DESC");
    const existingItem = inventoryRows.rows.find((inv) => {
      const display = [inv.brand, inv.model, inv.name].filter(Boolean).join(" ");
      return normalizeSearchKey(display) === partKey || normalizeSearchKey(inv.name) === partKey;
    });
    const itemId = existingItem?.id || `inv_purchase_${purchase.id}_${index}`;
    const inventoryData = existingItem ? {
      ...(existingItem.raw_data || {}),
      id: itemId,
      brand: existingItem.brand || "",
      model: existingItem.model || "",
      name: existingItem.name || part,
      category: existingItem.category || "Refacciones",
      supplierId: purchase.supplierId || existingItem.raw_data?.supplierId || "",
      quality: item.quality || existingItem.raw_data?.quality || "Por verificar",
      lot: purchase.folio || purchase.id,
      supplierWarrantyDays: Math.max(0, asNumber(item.supplierWarrantyDays || existingItem.raw_data?.supplierWarrantyDays || 0)),
      stock: Math.max(0, asNumber(existingItem.stock)) + qty,
      min: Math.max(1, asNumber(existingItem.min_stock || existingItem.raw_data?.min || 1)),
      minStock: Math.max(1, asNumber(existingItem.min_stock || existingItem.raw_data?.minStock || 1)),
      cost: cost || asNumber(existingItem.cost),
      subdealerPrice: Math.round((cost || asNumber(existingItem.cost)) * 1.3 * 100) / 100,
      price: asNumber(existingItem.price),
      updatedAt: timestamp
    } : {
      id: itemId,
      brand: "",
      model: "",
      name: part,
      category: "Refacciones",
      supplierId: purchase.supplierId || "",
      quality: item.quality || "Por verificar",
      lot: purchase.folio || purchase.id,
      supplierWarrantyDays: Math.max(0, asNumber(item.supplierWarrantyDays || 0)),
      serialNumbers: Array.isArray(item.serialNumbers) ? item.serialNumbers : [],
      stock: qty,
      min: 1,
      minStock: 1,
      cost,
      subdealerPrice: Math.round(cost * 1.3 * 100) / 100,
      price: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await syncNormalizedRecord("inventory", inventoryData, false, inventoryData.createdAt || timestamp, timestamp);
    await syncNormalizedRecord("inventoryMovement", {
      id: movementId,
      itemId,
      itemName: part,
      qty,
      type: "entrada",
      detail: `Compra recibida ${purchase.folio || purchase.id}: ${part}`,
      refId: purchase.id,
      createdAt: timestamp
    }, false, timestamp, timestamp);
    itemIdsForOrder.push(itemId);
    suppliedForOrder.push({
      id: `op_purchase_${purchase.id}_${item.id || index}`,
      inventoryId: itemId,
      purchaseId: purchase.id,
      purchaseItemId: item.id || "",
      part,
      qty,
      cost,
      totalCost: qty * cost,
      createdAt: timestamp
    });
  }
  if (purchase.orderId) {
    const orderResult = await query("SELECT raw_data FROM service_orders WHERE id = $1 AND archived = FALSE LIMIT 1", [purchase.orderId]);
    const order = orderResult.rows[0]?.raw_data;
    if (order) {
      const suppliedParts = Array.isArray(order.suppliedParts) ? order.suppliedParts : [];
      const newSupplied = suppliedForOrder.filter((entry) => !suppliedParts.some((existing) => existing.id === entry.id));
      if (newSupplied.length) {
        suppliedParts.push(...newSupplied);
        await syncNormalizedRecord("order", {
          ...order,
          suppliedParts,
          parts: [...new Set([...(order.parts || []), ...itemIdsForOrder])],
          updatedAt: timestamp
        }, false, order.createdAt || timestamp, timestamp);
      }
    }
  }
}

async function revertReceivedPurchaseEffects(purchaseId, timestamp = now()) {
  const affectedOrders = await query(
    `SELECT DISTINCT o.*
     FROM service_orders o
     JOIN order_parts op ON op.order_id = o.id
     WHERE op.purchase_id = $1 AND o.archived = FALSE
     FOR UPDATE OF o`,
    [purchaseId]
  );
  for (const row of affectedOrders.rows) {
    const parts = await query("SELECT * FROM order_parts WHERE order_id = $1 ORDER BY created_at ASC", [row.id]);
    const order = canonicalDataForRow("order", row);
    order.suppliedParts = parts.rows
      .filter((part) => part.purchase_id !== purchaseId)
      .map((part) => ({
        ...rawObject(part), id: part.id, inventoryId: part.inventory_id || "", purchaseId: part.purchase_id || "",
        purchaseItemId: part.purchase_item_id || "", part: part.part_name, qty: asNumber(part.qty), cost: asNumber(part.cost),
        totalCost: asNumber(part.total_cost), createdAt: part.created_at
      }));
    await syncNormalizedRecord("order", { ...order, updatedAt: timestamp }, false, order.createdAt, timestamp);
  }

  const movements = await query(
    "SELECT * FROM inventory_movements WHERE ref_id = $1 AND type = 'entrada' ORDER BY created_at DESC FOR UPDATE",
    [purchaseId]
  );
  for (const movement of movements.rows) {
    if (!movement.item_id) continue;
    const itemResult = await query("SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE", [movement.item_id]);
    const item = itemResult.rows[0];
    if (!item) continue;
    const qty = Math.max(0, asNumber(movement.qty));
    if (asNumber(item.stock) < qty) {
      throw businessError(
        `No se puede modificar la compra: ${item.name} ya fue consumido y faltan ${qty - asNumber(item.stock)} unidad(es) por conciliar.`,
        "purchase_stock_already_consumed"
      );
    }
    await syncNormalizedRecord("inventory", {
      ...canonicalDataForRow("inventory", item),
      stock: asNumber(item.stock) - qty,
      updatedAt: timestamp
    }, false, item.created_at, timestamp);
  }
  await query("DELETE FROM inventory_movements WHERE ref_id = $1 AND type = 'entrada'", [purchaseId]);
}

async function applyOrderInventoryEffects(order, archived = false, timestamp = now()) {
  if (!order?.id) return;
  const previous = await query(
    "SELECT * FROM inventory_movements WHERE ref_id = $1 AND type = 'salida_orden'",
    [order.id]
  );
  for (const movement of previous.rows) {
    if (!movement.item_id) continue;
    const itemResult = await query("SELECT * FROM inventory_items WHERE id = $1 LIMIT 1", [movement.item_id]);
    const item = itemResult.rows[0];
    if (!item) continue;
    const restoredStock = Math.max(0, asNumber(item.stock)) + Math.max(0, asNumber(movement.qty));
    await syncNormalizedRecord("inventory", {
      ...(item.raw_data || {}),
      id: item.id,
      brand: item.brand || item.raw_data?.brand || "",
      model: item.model || item.raw_data?.model || "",
      name: item.name || item.raw_data?.name || "Articulo",
      category: item.category || item.raw_data?.category || "",
      stock: restoredStock,
      min: Math.max(1, asNumber(item.min_stock || item.raw_data?.min || 1)),
      minStock: Math.max(1, asNumber(item.min_stock || item.raw_data?.minStock || 1)),
      cost: Math.max(0, asNumber(item.cost || item.raw_data?.cost)),
      subdealerPrice: Math.max(0, asNumber(item.subdealer_price || item.raw_data?.subdealerPrice)),
      price: Math.max(0, asNumber(item.price || item.raw_data?.price)),
      updatedAt: timestamp
    }, false, item.created_at || timestamp, timestamp);
  }
  await query("DELETE FROM inventory_movements WHERE ref_id = $1 AND type = 'salida_orden'", [order.id]);
  if (archived) return;

  const suppliedParts = Array.isArray(order.suppliedParts) ? order.suppliedParts : [];
  let index = 0;
  for (const part of suppliedParts.filter((entry) => entry?.inventoryId)) {
    index += 1;
    const qty = Math.max(1, asNumber(part.qty || 1));
    const itemResult = await query("SELECT * FROM inventory_items WHERE id = $1 AND archived = FALSE LIMIT 1 FOR UPDATE", [part.inventoryId]);
    const item = itemResult.rows[0];
    if (!item) throw businessError(`La refaccion ${part.part || part.inventoryId} ya no existe en inventario.`, "inventory_item_missing");
    if (asNumber(item.stock) < qty) {
      throw businessError(
        `Stock insuficiente para ${part.part || item.name}: disponible ${asNumber(item.stock)}, solicitado ${qty}.`,
        "insufficient_stock"
      );
    }
    const nextStock = asNumber(item.stock) - qty;
    const cost = Math.max(0, asNumber(part.cost || item.cost || item.raw_data?.cost));
    await syncNormalizedRecord("inventory", {
      ...(item.raw_data || {}),
      id: item.id,
      brand: item.brand || item.raw_data?.brand || "",
      model: item.model || item.raw_data?.model || "",
      name: item.name || item.raw_data?.name || part.part || "Articulo",
      category: item.category || item.raw_data?.category || "",
      stock: nextStock,
      min: Math.max(1, asNumber(item.min_stock || item.raw_data?.min || 1)),
      minStock: Math.max(1, asNumber(item.min_stock || item.raw_data?.minStock || 1)),
      cost,
      subdealerPrice: Math.round(cost * 1.3 * 100) / 100,
      price: Math.max(0, asNumber(item.price || item.raw_data?.price)),
      updatedAt: timestamp
    }, false, item.created_at || timestamp, timestamp);
    await syncNormalizedRecord("inventoryMovement", {
      id: `mov_order_${order.id}_${part.id || index}`,
      itemId: item.id,
      itemName: part.part || item.name || "Refaccion",
      qty,
      type: "salida_orden",
      detail: `Refaccion usada en orden ${order.folio || order.id}: ${part.part || item.name || "Refaccion"}`,
      refId: order.id,
      createdAt: timestamp
    }, false, timestamp, timestamp);
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
    const statuses = new Set(["Recibido", "Diagnostico", "Esperando pieza", "En reparacion", "Listo", "Entregado", "Cancelado"]);
    const priorities = new Set(["Baja", "Normal", "Alta", "Urgente"]);
    const approvals = new Set(["Pendiente", "Aprobado", "Rechazado"]);
    const technicianResult = data.technicianId
      ? await query("SELECT id, name FROM users WHERE id = $1 AND role = 'technician' AND active = TRUE LIMIT 1", [data.technicianId])
      : await query("SELECT id, name FROM users WHERE lower(name) = lower($1) AND role = 'technician' AND active = TRUE LIMIT 1", [String(data.technician || "")]);
    const technician = technicianResult.rows[0];
    if (!technician) throw businessError("Selecciona un tecnico activo registrado en Configuracion", "registered_technician_required", 400);
    data.technicianId = technician.id;
    data.technician = technician.name;
    if (!statuses.has(data.status || "Recibido")) throw businessError("Estatus de orden invalido", "invalid_order_status", 400);
    if (!priorities.has(data.priority || "Normal")) throw businessError("Prioridad invalida", "invalid_priority", 400);
    if (!approvals.has(data.approvalStatus || "Pendiente")) throw businessError("Autorizacion invalida", "invalid_approval", 400);
    if ((data.approvalStatus || "Pendiente") === "Aprobado" && !data.customerAuthorization) {
      throw businessError("Falta registrar la autorizacion del cliente", "customer_authorization_required", 400);
    }
    if (["Listo", "Entregado"].includes(data.status)) {
      const checklist = data.finalChecklist || {};
      const pendingChecks = pendingQualityChecks(checklist);
      if (pendingChecks.length) {
        throw businessError("Completa todas las pruebas funcionales antes de marcar el equipo como listo", "quality_checklist_required", 400);
      }
    }
    data.warrantyDays = 90;
    const previousOrder = await query("SELECT raw_data FROM service_orders WHERE id = $1 LIMIT 1", [recordId]);
    const previousRaw = rawObject(previousOrder.rows[0]);
    const incomingPattern = String(data.unlockPattern || "").trim();
    const previousEncryptedPattern = previousRaw.unlockPatternEncrypted
      || (previousRaw.unlockPattern ? encryptSensitive(previousRaw.unlockPattern) : "");
    delete data.unlockPattern;
    if (["Entregado", "Cancelado"].includes(data.status)) {
      delete data.unlockPatternEncrypted;
    } else if (incomingPattern) {
      data.unlockPatternEncrypted = encryptSensitive(incomingPattern);
    } else if (previousEncryptedPattern) {
      data.unlockPatternEncrypted = previousEncryptedPattern;
    }
    if (data.status === "Entregado") {
      data.deposit = Math.max(0, asNumber(data.total));
      data.paid = true;
      data.completedAt = data.completedAt || now();
    }
    if (data.folio) data.folio = await resolveUniqueJsonField(type, recordId, "folio", data.folio);
    if (data.trackingCode) data.trackingCode = await resolveUniqueJsonField(type, recordId, "trackingCode", data.trackingCode);
  }
  if (type === "purchase" && data.folio) {
    if (!["Cotizando", "Pedido", "Recibido", "Cancelado"].includes(data.status || "Cotizando")) {
      throw businessError("Estatus de compra invalido", "invalid_purchase_status", 400);
    }
    data.folio = await resolveUniqueJsonField(type, recordId, "folio", data.folio);
  }
  return { recordId, data };
}

async function resolveRecordId(type, requestedId) {
  const baseId = String(requestedId || id(type.slice(0, 3))).trim();
  let candidate = baseId;
  let consecutive = 2;
  while (true) {
    const existing = await findProfessionalRecordById(candidate);
    if (!existing || existing.type === type) return candidate;
    candidate = appendConsecutive(baseId, consecutive);
    consecutive += 1;
  }
}

async function resolveUniqueJsonField(type, recordId, field, value) {
  safeJsonField(field);
  const baseValue = String(value || "").trim();
  if (!baseValue) return baseValue;
  let candidate = baseValue;
  let consecutive = 2;
  while (true) {
    const existing = await findProfessionalRecordByBusinessKey(type, field, candidate, recordId);
    if (!existing.rows.length) return candidate;
    candidate = appendConsecutive(baseValue, consecutive);
    consecutive += 1;
  }
}

async function findProfessionalRecordById(recordId) {
  const tableMap = {
    settings: "app_settings",
    client: "clients",
    order: "service_orders",
    inventory: "inventory_items",
    supplier: "suppliers",
    appointment: "appointments",
    purchase: "purchases",
    payment: "payments",
    inventoryMovement: "inventory_movements",
    warrantyClaim: "warranty_claims",
    auditEntry: "audit_entries"
  };
  for (const [type, table] of Object.entries(tableMap)) {
    const result = await query(`SELECT id FROM ${table} WHERE id = $1 LIMIT 1`, [recordId]);
    if (result.rows.length) return { type, id: recordId };
  }
  return null;
}

async function findProfessionalRecordByBusinessKey(type, field, value, recordId) {
  if (type === "order" && field === "folio") {
    return query("SELECT id FROM service_orders WHERE archived = FALSE AND lower(folio) = lower($1) AND id <> $2 LIMIT 1", [value, recordId]);
  }
  if (type === "order" && field === "trackingCode") {
    return query("SELECT id FROM service_orders WHERE archived = FALSE AND tracking_code = $1 AND id <> $2 LIMIT 1", [value, recordId]);
  }
  if (type === "purchase" && field === "folio") {
    return query("SELECT id FROM purchases WHERE archived = FALSE AND lower(folio) = lower($1) AND id <> $2 LIMIT 1", [value, recordId]);
  }
  return { rows: [] };
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

function tableForType(type) {
  return {
    settings: "app_settings", client: "clients", supplier: "suppliers", inventory: "inventory_items",
    order: "service_orders", purchase: "purchases", payment: "payments", appointment: "appointments",
    warrantyClaim: "warranty_claims", inventoryMovement: "inventory_movements", auditEntry: "audit_entries"
  }[type] || "";
}

function canWriteType(user, type) {
  if (user?.role === "admin" || user?.role === "manager") return true;
  return user?.role === "technician" && ["client", "order", "appointment", "warrantyClaim", "payment", "purchase"].includes(type);
}

function canReadType(user, type) {
  const role = user?.role || "";
  if (["admin", "manager"].includes(role)) return true;
  if (role === "technician") {
    return ["settings", "client", "order", "inventory", "supplier", "appointment", "purchase", "payment", "warrantyClaim", "inventoryMovement"].includes(type);
  }
  if (role === "viewer") return ["settings", "order", "inventory", "appointment"].includes(type);
  return false;
}

function sanitizeDataForUser(user, type, input) {
  const data = { ...(input || {}) };
  delete data.unlockPattern;
  delete data.unlockPatternEncrypted;
  if (["technician", "viewer"].includes(user?.role)) {
    if (type === "inventory") {
      delete data.cost;
      delete data.subdealerPrice;
    }
    if (type === "order") {
      data.suppliedParts = (data.suppliedParts || []).map((part) => {
        const safePart = { ...part };
        delete safePart.cost;
        delete safePart.totalCost;
        return safePart;
      });
      delete data.internalCost;
      delete data.laborCost;
    }
    if (type === "purchase") {
      delete data.cost;
      data.items = (data.items || []).map((item) => {
        const safeItem = { ...item };
        delete safeItem.cost;
        return safeItem;
      });
    }
    if (type === "supplier") delete data.notes;
  }
  if (user?.role === "viewer") {
    delete data.phone;
    delete data.email;
    delete data.address;
    delete data.total;
    delete data.deposit;
  }
  return data;
}

function sanitizeEnvelopeForUser(user, type, row) {
  return { ...row, data: sanitizeDataForUser(user, type, row.data || row) };
}

function canAccessOrderSecret(user, order) {
  if (["admin", "manager"].includes(user?.role)) return true;
  if (user?.role !== "technician") return false;
  const raw = rawObject(order);
  return raw.technicianId === user.sub || normalizeSearchKey(order.technician) === normalizeSearchKey(user.name);
}

async function lockTypedRecord(type, recordId) {
  const table = tableForType(type);
  if (!table || !recordId) return null;
  const timestampColumn = ["inventoryMovement", "auditEntry"].includes(type) ? "created_at" : "updated_at";
  const result = await query(`SELECT id, ${timestampColumn} AS updated_at FROM ${table} WHERE id = $1 FOR UPDATE`, [recordId]);
  return result.rows[0] || null;
}

function createRateLimiter({ windowMs, max, message, failuresOnly = false }) {
  const buckets = new Map();
  return (req, res, next) => {
    const key = `${req.ip}:${String(req.body?.email || "").toLowerCase()}`;
    const currentTime = Date.now();
    const bucket = buckets.get(key);
    const activeBucket = !bucket || bucket.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + windowMs }
      : bucket;
    buckets.set(key, activeBucket);
    if (activeBucket.count >= max) {
      res.set("Retry-After", String(Math.ceil((activeBucket.resetAt - currentTime) / 1000)));
      return res.status(429).json({ error: message });
    }
    if (failuresOnly) {
      res.on("finish", () => {
        if (res.statusCode === 401) activeBucket.count += 1;
        else if (res.statusCode < 400) buckets.delete(key);
      });
    } else {
      activeBucket.count += 1;
    }
    next();
  };
}

const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, failuresOnly: true, message: "Demasiados intentos. Espera 15 minutos e intenta de nuevo." });
const publicPortalLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 15, message: "Demasiadas consultas. Espera un minuto." });

app.use(helmet({ crossOriginResourcePolicy: false }));
app.set("trust proxy", 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const developmentOrigin = process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (productionCorsOrigins.includes(origin) || developmentOrigin) return callback(null, true);
    return callback(businessError("Origen no permitido", "cors_origin_denied", 403));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Cache-Control", "Pragma"]
}));
app.use(express.json({
  limit: "12mb",
  verify(req, _res, buffer) {
    if (req.originalUrl?.startsWith("/api/whatsapp/webhook")) req.rawBody = Buffer.from(buffer);
  }
}));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.get(["/", "/health", "/api/health"], (_req, res) => res.json({
  ok: true,
  service: "PCFix backend",
  mode: "postgres",
  version: backendVersion,
  login: "/api/auth/login",
  health: "/api/health",
  stability: "/api/stability",
  at: now()
}));

app.get("/api/stability", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  const report = await getStabilityReport();
  const purchaseSource = await getPurchaseSourceReport();
  res.json({
    ok: report.ok,
    service: "PCFix backend",
    mode: "postgres",
    version: backendVersion,
    professionalDatabase: true,
    restrictions: report.restrictions,
    protectedReports: {
      analytics: "/api/admin/analytics",
      integrity: "/api/admin/integrity",
      stability: "/api/admin/stability"
    },
    totals: report.totals,
    normalizedTotals: report.normalizedTotals,
    purchaseSource,
    duplicates: report.duplicates,
    adminRepair: "/api/admin/stability/repair"
  });
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const result = await query("SELECT * FROM users WHERE email = $1 AND active = TRUE", [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(String(req.body?.password || ""), user.password_hash))) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }
  await audit(user.id, "login", "user", user.id, "Inicio de sesion");
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/public/orders/:folio", publicPortalLimiter, async (req, res) => {
  const lookup = String(req.params.folio || "").trim();
  const folio = lookup.toLowerCase();
  const trackingCode = String(req.query.code || "").trim();
  if (!trackingCode) {
    return res.status(400).json({ error: "Codigo de seguimiento requerido", code: "tracking_code_required" });
  }
  const digits = lookup.replace(/\D/g, "");
  const looksLikePhone = digits.length >= 8 && !/[a-z]/i.test(lookup);
  const normalizedResult = looksLikePhone
    ? await query(
        `SELECT o.*, c.name AS client_name
         FROM service_orders o
         LEFT JOIN clients c ON c.id = o.client_id
         WHERE o.archived = FALSE
           AND right(regexp_replace(COALESCE(c.phone, ''), '\\D', '', 'g'), 10) = $1
           AND o.tracking_code = $2
         ORDER BY o.updated_at DESC LIMIT 1`,
        [digits.slice(-10), trackingCode]
      )
    : await query(
        "SELECT o.*, c.name AS client_name FROM service_orders o LEFT JOIN clients c ON c.id = o.client_id WHERE o.archived = FALSE AND lower(o.folio) = $1 AND o.tracking_code = $2 ORDER BY o.updated_at DESC LIMIT 1",
        [folio, trackingCode]
      );
  if (normalizedResult.rows[0]) {
    const row = normalizedResult.rows[0];
    const order = row.raw_data || {};
    const orderParts = await query("SELECT part_name, qty FROM order_parts WHERE order_id = $1 ORDER BY created_at ASC", [row.id]);
    const publicParts = orderParts.rows.map((part) => ({ part: part.part_name || "Refaccion", qty: Math.max(1, asNumber(part.qty || 1)) }));
    const publicEvidence = await materializeEvidencePhotos(order.statusEvidencePhotos || row.status_evidence_photos || [], 600);
    return res.json({
      ok: true,
      order: {
        id: row.id,
        folio: row.folio,
        status: row.status,
        priority: row.priority || "Normal",
        promisedAt: row.promised_at || "",
        approvalStatus: row.approval_status || "Pendiente",
        device: row.device,
        technician: row.technician || order.technician || "",
        issue: row.issue,
        notes: row.notes,
        physicalState: row.physical_state,
        accessories: row.accessories || order.accessories || "",
        warrantyDays: row.warranty_days,
        warrantyTerms: row.warranty_terms,
        total: row.total,
        deposit: row.deposit,
        paid: row.paid,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        statusHistory: order.statusHistory || row.status_history || [],
        statusEvidencePhotos: publicEvidence,
        suppliedParts: publicParts
      },
      client: {
        name: row.client_name || "Cliente"
      }
    });
  }
  res.status(404).json({ error: "Orden no encontrada" });
});

app.post("/api/public/orders/:lookup/approval", publicPortalLimiter, async (req, res) => {
  const lookup = String(req.params.lookup || "").trim();
  const trackingCode = String(req.body?.code || "").trim();
  const decision = String(req.body?.decision || "");
  const customerName = String(req.body?.customerName || "").trim().slice(0, 120);
  if (!trackingCode) return res.status(400).json({ error: "Codigo de seguimiento requerido" });
  if (!["Aprobado", "Rechazado"].includes(decision)) return res.status(400).json({ error: "Decision invalida" });
  if (customerName.length < 3) return res.status(400).json({ error: "Escribe el nombre de quien autoriza" });
  const digits = lookup.replace(/\D/g, "");
  const looksLikePhone = digits.length >= 8 && !/[a-z]/i.test(lookup);
  try {
    const result = await withTransaction(async () => {
      const orderResult = looksLikePhone
        ? await query(
            `SELECT o.* FROM service_orders o LEFT JOIN clients c ON c.id = o.client_id
             WHERE o.archived = FALSE AND right(regexp_replace(COALESCE(c.phone, ''), '\\D', '', 'g'), 10) = $1
               AND o.tracking_code = $2 ORDER BY o.updated_at DESC LIMIT 1 FOR UPDATE OF o`,
            [digits.slice(-10), trackingCode]
          )
        : await query(
            "SELECT * FROM service_orders WHERE archived = FALSE AND lower(folio) = lower($1) AND tracking_code = $2 LIMIT 1 FOR UPDATE",
            [lookup, trackingCode]
          );
      const order = orderResult.rows[0];
      if (!order) throw businessError("Orden o codigo no validos", "order_not_found", 404);
      if (["Entregado", "Cancelado"].includes(order.status)) throw businessError("Esta orden ya no admite autorizaciones", "approval_closed", 409);
      const timestamp = now();
      const raw = rawObject(order);
      const authorizationMeta = {
        decision,
        customerName,
        at: timestamp,
        channel: "portal_cliente"
      };
      const nextRaw = {
        ...raw,
        approvalStatus: decision,
        approved: decision === "Aprobado",
        customerAuthorization: decision === "Aprobado",
        authorizationMeta,
        updatedAt: timestamp
      };
      await query(
        "UPDATE service_orders SET approval_status = $1, approved = $2, raw_data = $3, updated_at = $4 WHERE id = $5",
        [decision, decision === "Aprobado", JSON.stringify(nextRaw), timestamp, order.id]
      );
      const ipHash = createHash("sha256").update(`${req.ip}|${sensitiveDataSecret}`).digest("hex");
      await query(
        "INSERT INTO order_approvals (id,order_id,decision,customer_name,ip_hash,user_agent,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [id("apr"), order.id, decision, customerName, ipHash, String(req.headers["user-agent"] || "").slice(0, 300), timestamp]
      );
      await audit(null, "customer_quote_decision", "order", order.id, `${decision} por ${customerName}`);
      return { orderId: order.id, folio: order.folio, decision, at: timestamp };
    });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    res.status(error?.status || 500).json({ error: error?.message || "No se pudo registrar la autorizacion", code: error?.code || "approval_failed" });
  }
});

app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));

app.get("/api/state/revision", requireAuth, async (_req, res) => {
  res.json({ revision: await getStateRevision(), at: now() });
});

app.get("/api/state", requireAuth, async (req, res) => {
  const definitions = [
    ["settings", "settings"],
    ["clients", "client"],
    ["orders", "order"],
    ["inventory", "inventory"],
    ["suppliers", "supplier"],
    ["appointments", "appointment"],
    ["purchases", "purchase"],
    ["payments", "payment"],
    ["inventoryMovements", "inventoryMovement"],
    ["warrantyClaims", "warrantyClaim"],
    ["auditLog", "auditEntry"]
  ].filter(([, type]) => canReadType(req.user, type));
  const loaded = await Promise.all(definitions.map(async ([stateKey, type]) => [stateKey, type, await getNormalizedRecordsForType(type, false)]));
  const payload = {};
  for (const [stateKey, type, rows] of loaded) {
    const sanitizedRows = rows.map((row) => sanitizeEnvelopeForUser(req.user, type, row));
    payload[stateKey] = type === "settings"
      ? sanitizedRows[0]?.data || null
      : sanitizedRows.map((row) => row.data || row);
  }
  const technicians = req.user?.role === "technician"
    ? await query("SELECT id, name, email FROM users WHERE id = $1 AND active = TRUE AND role = 'technician'", [req.user.sub])
    : await query("SELECT id, name, email FROM users WHERE active = TRUE AND role = 'technician' ORDER BY lower(name), lower(email)");
  const canSeeTechnicianEmail = ["admin", "manager"].includes(req.user?.role);
  payload.technicians = technicians.rows.map((row) => ({
    id: row.id,
    name: row.name,
    ...(canSeeTechnicianEmail ? { email: row.email } : {})
  }));
  res.json({ ok: true, at: now(), revision: await getStateRevision(), data: payload });
});

app.post("/api/orders/:id/payments", requireAuth, requireRole("admin", "manager", "technician"), async (req, res) => {
  const orderId = req.params.id;
  const amount = asNumber(req.body?.amount);
  if (amount <= 0) return res.status(400).json({ error: "El pago debe ser mayor a cero" });
  try {
    const result = await withTransaction(async () => {
      const orderResult = await query("SELECT * FROM service_orders WHERE id = $1 AND archived = FALSE FOR UPDATE", [orderId]);
      const orderRow = orderResult.rows[0];
      if (!orderRow) throw businessError("La orden ya no existe o fue archivada", "order_not_found", 404);
      const balance = Math.max(0, asNumber(orderRow.total) - asNumber(orderRow.deposit));
      if (amount > balance + 0.001) {
        throw businessError(`El pago excede el saldo disponible de ${balance.toFixed(2)}.`, "payment_exceeds_balance");
      }
      const timestamp = now();
      const paymentId = id("pay");
      const payment = {
        id: paymentId,
        orderId,
        amount,
        method: String(req.body?.method || "Efectivo"),
        reference: String(req.body?.reference || ""),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await syncNormalizedRecord("payment", payment, false, timestamp, timestamp);
      const nextDeposit = Math.min(asNumber(orderRow.total), asNumber(orderRow.deposit) + amount);
      const paid = nextDeposit >= asNumber(orderRow.total);
      const orderData = { ...canonicalDataForRow("order", orderRow), deposit: nextDeposit, paid, updatedAt: timestamp };
      await query(
        "UPDATE service_orders SET deposit = $1, paid = $2, raw_data = $3, updated_at = $4 WHERE id = $5",
        [nextDeposit, paid, JSON.stringify(orderData), timestamp, orderId]
      );
      await audit(req.user.sub, "payment_create", "payment", paymentId, `${orderRow.folio}: ${amount}`);
      return { payment, balance: Math.max(0, asNumber(orderRow.total) - nextDeposit), paid };
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(error?.status || 500).json({ error: error?.message || "No se pudo registrar el pago", code: error?.code || "payment_failed" });
  }
});

app.get("/api/records/:type", requireAuth, async (req, res) => {
  const { type } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  if (!canReadType(req.user, type)) return res.status(403).json({ error: "Tu rol no puede consultar este modulo" });
  const includeArchived = req.query.archived === "1";
  const rows = await getNormalizedRecordsForType(type, includeArchived);
  res.json(rows.map((row) => sanitizeEnvelopeForUser(req.user, type, row)));
});

app.get("/api/orders/:id/unlock", requireAuth, async (req, res) => {
  const result = await query("SELECT id, folio, technician, raw_data FROM service_orders WHERE id = $1 AND archived = FALSE LIMIT 1", [req.params.id]);
  const order = result.rows[0];
  if (!order) return res.status(404).json({ error: "Orden no encontrada" });
  if (!canAccessOrderSecret(req.user, order)) return res.status(403).json({ error: "No tienes permiso para consultar esta clave" });
  const raw = rawObject(order);
  const pattern = decryptSensitive(raw.unlockPatternEncrypted)
    || String(raw.unlockPattern || "");
  await audit(req.user.sub, "unlock_pattern_view", "order", order.id, order.folio || "");
  res.json({ pattern, patternSize: Number(raw.patternSize || 3) });
});

app.get("/api/orders/:id/evidence", requireAuth, async (req, res) => {
  const result = await query("SELECT id, folio, technician, status_evidence_photos, raw_data FROM service_orders WHERE id = $1 AND archived = FALSE LIMIT 1", [req.params.id]);
  const order = result.rows[0];
  if (!order) return res.status(404).json({ error: "Orden no encontrada" });
  if (!canAccessOrderSecret(req.user, order)) return res.status(403).json({ error: "No tienes permiso para consultar esta evidencia" });
  const raw = rawObject(order);
  const photos = await materializeEvidencePhotos(raw.statusEvidencePhotos || order.status_evidence_photos || [], 900);
  await audit(req.user.sub, "evidence_view", "order", order.id, order.folio || "");
  res.json({ photos });
});

app.post("/api/records/:type", requireAuth, requireRole("admin", "manager", "technician"), async (req, res) => {
  const { type } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  if (!canWriteType(req.user, type)) return res.status(403).json({ error: "Tu rol no puede modificar este modulo" });
  const record = req.body?.data || {};
  if (req.user?.role === "technician" && type === "order") {
    if (record.technicianId && record.technicianId !== req.user.sub) {
      return res.status(403).json({ error: "Solo puedes asignarte ordenes a tu propio usuario" });
    }
    record.technicianId = req.user.sub;
    record.technician = req.user.name;
  }
  if (req.user?.role === "technician" && type === "purchase") {
    const hasCost = asNumber(record.cost) > 0 || (record.items || []).some((item) => asNumber(item.cost) > 0);
    if ((record.status || "Cotizando") !== "Cotizando" || hasCost) {
      return res.status(403).json({ error: "El tecnico solo puede crear solicitudes de cotizacion sin costo; Compras debe confirmar precio y recepcion." });
    }
  }
  const requestedId = req.body?.id || record.id;
  const expectedUpdatedAt = String(req.body?.expectedUpdatedAt || "");
  const saveAttempt = async (forcedId = requestedId) => withTransaction(async () => {
    const prepared = await prepareRecordForSave(type, forcedId, record);
    const { recordId, data } = prepared;
    const locked = await lockTypedRecord(type, recordId);
    if (locked && expectedUpdatedAt && String(locked.updated_at) !== expectedUpdatedAt) {
      throw businessError(
        "Este registro fue modificado por otra persona. Los datos se recargaron; revisa los cambios antes de guardar.",
        "stale_record"
      );
    }
    const timestamp = now();
    await syncNormalizedRecord(type, data, Boolean(record.archived), locked?.created_at || timestamp, timestamp);
    await audit(req.user.sub, locked ? "update" : "create", type, recordId, req.body?.detail || "");
    return { recordId, data, existing: Boolean(locked) };
  });

  try {
    const saved = await saveAttempt();
    return res.status(saved.existing ? 200 : 201).json({
      id: saved.recordId,
      data: saved.data,
      deduped: saved.recordId !== requestedId
    });
  } catch (error) {
    if (error?.constraint === "uq_inventory_sku_active") {
      return res.status(409).json({ error: "Ese SKU ya pertenece a otro articulo activo.", code: "duplicate_sku" });
    }
    if (error?.code === "23505") {
      try {
        const retry = await saveAttempt(appendConsecutive(requestedId, 2));
        await audit(req.user.sub, "dedupe_save", type, retry.recordId, `Conflicto unico resuelto desde ${requestedId}`);
        return res.status(201).json({ id: retry.recordId, data: retry.data, deduped: true });
      } catch (retryError) {
        error = retryError;
      }
    }
    if (error?.code === "23503") {
      return res.status(409).json({ error: "El registro relacionado ya no existe. Recarga la base de datos e intenta de nuevo.", code: "invalid_relation" });
    }
    console.error(`Error guardando ${type}`, { code: error?.code, detail: error?.detail, message: error?.message, recordId: requestedId });
    return res.status(error?.status || 500).json({
      error: error?.status ? error.message : `No se pudo guardar ${type}: ${error?.detail || error?.message || "Error interno"}`,
      code: error?.code || "save_failed"
    });
  }
});

app.post("/api/records/:type/:id/archive", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const { type, id: recordId } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  try {
    await withTransaction(async () => {
      await lockTypedRecord(type, recordId);
      await archiveNormalizedRecord(type, recordId);
      await audit(req.user.sub, "archive", type, recordId, req.body?.detail || "");
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(error?.status || 500).json({ error: error?.message || "No se pudo archivar", code: error?.code || "archive_failed" });
  }
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

app.get("/api/admin/purchases/source", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  res.json(await getPurchaseSourceReport(true));
});

app.post("/api/admin/stability/repair", requireAuth, requireRole("admin"), async (req, res) => {
  await repairProfessionalDuplicateBusinessKeys();
  await audit(req.user.sub, "manual_stability_repair", "professional_tables", "", "Reparacion manual de duplicados");
  res.json(await getStabilityReport());
});

async function getStabilityReport() {
  const [ordersFolio, ordersTracking, purchasesFolio, totals, normalizedTotals] = await Promise.all([
    findDuplicateProfessionalValues("service_orders", "folio"),
    findDuplicateProfessionalValues("service_orders", "tracking_code"),
    findDuplicateProfessionalValues("purchases", "folio"),
    query(`
      SELECT *
      FROM (VALUES
        ('client', (SELECT COUNT(*)::int FROM clients WHERE archived = FALSE)),
        ('order', (SELECT COUNT(*)::int FROM service_orders WHERE archived = FALSE)),
        ('inventory', (SELECT COUNT(*)::int FROM inventory_items WHERE archived = FALSE)),
        ('supplier', (SELECT COUNT(*)::int FROM suppliers WHERE archived = FALSE)),
        ('appointment', (SELECT COUNT(*)::int FROM appointments WHERE archived = FALSE)),
        ('purchase', (SELECT COUNT(*)::int FROM purchases WHERE archived = FALSE)),
        ('payment', (SELECT COUNT(*)::int FROM payments WHERE archived = FALSE)),
        ('inventoryMovement', (SELECT COUNT(*)::int FROM inventory_movements)),
        ('warrantyClaim', (SELECT COUNT(*)::int FROM warranty_claims WHERE archived = FALSE)),
        ('auditEntry', (SELECT COUNT(*)::int FROM audit_entries))
      ) AS totals(type,total)
      ORDER BY type
    `),
    getNormalizedTotals()
  ]);
  return {
    ok: !ordersFolio.length && !ordersTracking.length && !purchasesFolio.length,
    restrictions: [
      "orden.folio unico en ordenes activas",
      "orden.trackingCode unico en ordenes activas",
      "compra.folio unico en compras activas",
      "id primario unico por tabla profesional",
      "lectura y escritura directa en tablas profesionales",
      "guardados criticos dentro de transacciones PostgreSQL",
      "stock no negativo y relaciones nuevas protegidas con llaves foraneas",
      "control de concurrencia por updated_at"
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

async function getPurchaseSourceReport(includeRows = false) {
  const [dbInfo, purchaseCounts, recordsTable, purchaseRows] = await Promise.all([
    query(`
      SELECT
        current_database() AS database,
        current_schema() AS schema,
        inet_server_addr()::text AS server_addr,
        inet_server_port()::text AS server_port
    `),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE archived = FALSE)::int AS active,
        COUNT(*) FILTER (WHERE archived = TRUE)::int AS archived,
        COUNT(*)::int AS total
      FROM purchases
    `),
    query(`
      SELECT to_regclass('public.records') IS NOT NULL AS exists
    `),
    query(`
      SELECT id, folio, status, archived, updated_at
      FROM purchases
      ORDER BY updated_at DESC
    `)
  ]);
  const legacyExists = Boolean(recordsTable.rows[0]?.exists);
  return {
    backendVersion,
    sourceTable: "purchases",
    selectUsedByApp: "SELECT * FROM purchases WHERE archived = FALSE; productos desde purchase_items; columnas normalizadas prevalecen sobre raw_data",
    database: dbInfo.rows[0],
    counts: purchaseCounts.rows[0],
    legacyRecordsTable: {
      exists: legacyExists,
      action: legacyExists ? "La tabla legacy existe; el arranque nuevo la eliminara." : "No existe tabla legacy."
    },
    rows: includeRows ? purchaseRows.rows : purchaseRows.rows.map((row) => ({
      id: row.id,
      folio: row.folio,
      status: row.status,
      archived: row.archived,
      updated_at: row.updated_at
    }))
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
        COUNT(*) FILTER (WHERE archived = FALSE AND status = 'Cancelado')::int AS canceled_orders,
        COUNT(*) FILTER (WHERE archived = FALSE AND status NOT IN ('Entregado','Cancelado') AND COALESCE(promised_at, '') <> '' AND promised_at::timestamptz < NOW())::int AS overdue_orders,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at::timestamptz - created_at::timestamptz)) / 86400.0)
          FILTER (WHERE archived = FALSE AND status = 'Entregado' AND COALESCE(completed_at, '') <> ''), 0) AS average_cycle_days
      FROM service_orders
    `),
    query(`
      WITH order_costs AS (
        SELECT order_id, COALESCE(SUM(total_cost), 0) AS parts_cost
        FROM order_parts
        GROUP BY order_id
      )
      SELECT
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'Entregado'), 0) AS revenue,
        COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('Entregado','Cancelado')), 0) AS work_in_progress_value,
        COALESCE(SUM(COALESCE(c.parts_cost, 0)) FILTER (WHERE o.status = 'Entregado'), 0) AS parts_cost,
        0::numeric AS labor_cost,
        COALESCE(SUM(o.total - COALESCE(c.parts_cost, 0)) FILTER (WHERE o.status = 'Entregado'), 0) AS gross_margin,
        COALESCE(SUM(LEAST(o.total, o.deposit)), 0) AS collected,
        COALESCE(SUM(GREATEST(o.total - o.deposit, 0)), 0) AS receivables
      FROM service_orders o
      LEFT JOIN order_costs c ON c.order_id = o.id
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
      WITH item_totals AS (
        SELECT purchase_id, SUM(qty * cost) AS amount
        FROM purchase_items
        GROUP BY purchase_id
      )
      SELECT
        COUNT(*) FILTER (WHERE p.archived = FALSE AND p.status NOT IN ('Recibido','Cancelado'))::int AS pending_purchases,
        COALESCE(SUM(COALESCE(i.amount, p.qty * p.cost)) FILTER (WHERE p.archived = FALSE AND p.status NOT IN ('Recibido','Cancelado')), 0) AS pending_purchase_value
      FROM purchases p
      LEFT JOIN item_totals i ON i.purchase_id = p.id
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
      SELECT substring(COALESCE(completed_at, updated_at), 1, 7) AS month, COALESCE(SUM(total), 0) AS revenue, COUNT(*)::int AS orders
      FROM service_orders
      WHERE archived = FALSE AND status = 'Entregado'
      GROUP BY substring(COALESCE(completed_at, updated_at), 1, 7)
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
      workInProgressValue: asNumber(finance.work_in_progress_value),
      partsCost: asNumber(finance.parts_cost),
      laborCost: asNumber(finance.labor_cost),
      grossMargin: asNumber(finance.gross_margin),
      collected: asNumber(finance.collected),
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
      key: "receivedPurchasesWithoutMovement",
      label: "Compras recibidas sin entrada de inventario",
      sql: "SELECT COUNT(*)::int AS total FROM purchases p WHERE p.archived = FALSE AND p.status = 'Recibido' AND NOT EXISTS (SELECT 1 FROM inventory_movements m WHERE m.ref_id = p.id AND m.type = 'entrada')"
    },
    {
      key: "deliveredOrdersWithBalance",
      label: "Ordenes entregadas con saldo inconsistente",
      sql: "SELECT COUNT(*)::int AS total FROM service_orders WHERE archived = FALSE AND status = 'Entregado' AND (paid = FALSE OR deposit < total)"
    },
    {
      key: "incorrectPartTotals",
      label: "Costos de refaccion sin cuadrar",
      sql: "SELECT COUNT(*)::int AS total FROM order_parts WHERE abs(total_cost - (qty * cost)) > 0.01"
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

function rawObject(row) {
  if (!row?.raw_data) return {};
  if (typeof row.raw_data === "object") return row.raw_data;
  try { return JSON.parse(row.raw_data); } catch { return {}; }
}

function canonicalDataForRow(type, row) {
  const raw = rawObject(row);
  const common = {
    ...raw,
    id: row.id,
    archived: Boolean(row.archived),
    createdAt: row.created_at || raw.createdAt || row.updated_at,
    updatedAt: row.updated_at || raw.updatedAt || row.created_at
  };
  if (type === "settings") return {
    ...raw,
    id: row.id,
    businessName: row.business_name || "",
    businessPhone: row.business_phone || "",
    businessAddress: row.business_address || "",
    whatsappTemplate: row.whatsapp_template || "",
    theme: row.theme || {},
    updatedAt: row.updated_at
  };
  if (type === "client") return { ...common, name: row.name, phone: row.phone || "", email: row.email || "", address: row.address || "" };
  if (type === "supplier") return { ...common, name: row.name, contact: row.contact || "", phone: row.phone || "", email: row.email || "", category: row.category || "", notes: row.notes || "" };
  if (type === "inventory") return {
    ...common, sku: row.sku || "", location: row.location || "", brand: row.brand || "", model: row.model || "",
    name: row.name, category: row.category || "", stock: asNumber(row.stock), min: asNumber(row.min_stock),
    minStock: asNumber(row.min_stock), cost: asNumber(row.cost), subdealerPrice: asNumber(row.subdealer_price), price: asNumber(row.price)
  };
  if (type === "order") return {
    ...common, folio: row.folio, trackingCode: row.tracking_code || "", clientId: row.client_id || "",
    device: row.device, technician: row.technician || "", serial: row.serial || "", status: row.status,
    priority: row.priority || "Normal", promisedAt: row.promised_at || "", approvalStatus: row.approval_status || "Pendiente",
    issue: row.issue || "", notes: row.notes || "", accessories: row.accessories || "", physicalState: row.physical_state || "",
    total: asNumber(row.total), laborCost: asNumber(row.labor_cost), deposit: asNumber(row.deposit), paid: Boolean(row.paid),
    warrantyDays: Number(row.warranty_days || 90), warrantyTerms: row.warranty_terms || "", approved: Boolean(row.approved),
    quotePartName: row.quote_part_name || "", quoteSupplierId: row.quote_supplier_id || "",
    statusHistory: row.status_history || [], statusEvidencePhotos: row.status_evidence_photos || [], completedAt: row.completed_at || ""
  };
  if (type === "purchase") return {
    ...common, folio: row.folio, supplierId: row.supplier_id || "", orderId: row.order_id || "", part: row.part || "",
    qty: asNumber(row.qty), cost: asNumber(row.cost), status: row.status, notes: row.notes || "",
    receivedAt: row.received_at || "", receivedQuantities: row.received_quantities || {}
  };
  if (type === "payment") return { ...common, orderId: row.order_id || "", amount: asNumber(row.amount), method: row.method || "", reference: row.reference || "" };
  if (type === "appointment") return { ...common, clientId: row.client_id || "", orderId: row.order_id || "", date: row.date || "", time: row.time || "", type: row.type || "", notes: row.notes || "" };
  if (type === "warrantyClaim") return { ...common, orderId: row.order_id || "", reason: row.reason || "", resolution: row.resolution || "", status: row.status || "", cost: asNumber(row.cost) };
  if (type === "inventoryMovement") return { ...common, itemId: row.item_id || "", itemName: row.item_name || "", qty: asNumber(row.qty), type: row.type || "", detail: row.detail || "", refId: row.ref_id || "" };
  if (type === "auditEntry") return { ...common, type: row.type || "", detail: row.detail || "", refId: row.ref_id || "" };
  return common;
}

function normalizedEnvelope(type, row, data) {
  return { id: row.id, type, data, archived: Boolean(row.archived), created_at: row.created_at, updated_at: row.updated_at || row.created_at };
}

async function getNormalizedRecordsForType(type, includeArchived = false) {
  const archivedClause = includeArchived ? "" : "WHERE archived = FALSE";
  const simpleMap = {
    client: ["clients", "updated_at"], supplier: ["suppliers", "updated_at"], inventory: ["inventory_items", "updated_at"],
    order: ["service_orders", "updated_at"], purchase: ["purchases", "updated_at"], payment: ["payments", "updated_at"],
    appointment: ["appointments", "updated_at"], warrantyClaim: ["warranty_claims", "updated_at"]
  };
  if (type === "settings") {
    const result = await query("SELECT * FROM app_settings ORDER BY updated_at DESC LIMIT 1");
    return result.rows.map((row) => normalizedEnvelope(type, row, canonicalDataForRow(type, row)));
  }
  if (type === "inventoryMovement" || type === "auditEntry") {
    const table = type === "inventoryMovement" ? "inventory_movements" : "audit_entries";
    const result = await query(`SELECT *, FALSE AS archived, created_at AS updated_at FROM ${table} ORDER BY created_at DESC`);
    return result.rows.map((row) => normalizedEnvelope(type, row, canonicalDataForRow(type, row)));
  }
  const map = simpleMap[type];
  if (!map) return [];
  const [table, orderColumn] = map;
  const result = await query(`SELECT * FROM ${table} ${archivedClause} ORDER BY ${orderColumn} DESC`);
  let childRows = [];
  if (type === "order" && result.rows.length) {
    childRows = (await query("SELECT * FROM order_parts WHERE order_id = ANY($1::text[]) ORDER BY created_at ASC", [result.rows.map((row) => row.id)])).rows;
  }
  if (type === "purchase" && result.rows.length) {
    childRows = (await query("SELECT * FROM purchase_items WHERE purchase_id = ANY($1::text[])", [result.rows.map((row) => row.id)])).rows;
  }
  return result.rows.map((row) => {
    const data = canonicalDataForRow(type, row);
    if (type === "order") data.suppliedParts = childRows.filter((part) => part.order_id === row.id).map((part) => ({
      ...rawObject(part), id: part.id, inventoryId: part.inventory_id || "", purchaseId: part.purchase_id || "",
      purchaseItemId: part.purchase_item_id || "", part: part.part_name, qty: asNumber(part.qty), cost: asNumber(part.cost),
      totalCost: asNumber(part.total_cost), createdAt: part.created_at
    }));
    if (type === "purchase") data.items = childRows.filter((item) => item.purchase_id === row.id).map((item) => ({
      ...rawObject(item), id: item.id, part: item.part, qty: asNumber(item.qty), cost: asNumber(item.cost)
    }));
    return normalizedEnvelope(type, row, data);
  });
}

async function archiveNormalizedRecord(type, recordId) {
  const tableMap = {
    client: "clients",
    supplier: "suppliers",
    inventory: "inventory_items",
    order: "service_orders",
    purchase: "purchases",
    payment: "payments",
    appointment: "appointments",
    warrantyClaim: "warranty_claims"
  };
  const table = tableMap[type];
  if (!table) return;
  let orderData = null;
  if (type === "purchase") {
    const purchase = await query("SELECT status FROM purchases WHERE id = $1 FOR UPDATE", [recordId]);
    if (normalizeSearchKey(purchase.rows[0]?.status) === "recibido") {
      await revertReceivedPurchaseEffects(recordId, now());
    }
  }
  if (type === "order") {
    const current = await query("SELECT raw_data FROM service_orders WHERE id = $1 LIMIT 1", [recordId]);
    orderData = current.rows[0]?.raw_data || null;
  }
  await query(`UPDATE ${table} SET archived = TRUE, updated_at = $1 WHERE id = $2`, [now(), recordId]);
  if (type === "order" && orderData) {
    await applyOrderInventoryEffects(orderData, true, now());
  }
}

async function findDuplicateProfessionalValues(table, column) {
  const allowed = {
    service_orders: new Set(["folio", "tracking_code"]),
    purchases: new Set(["folio"])
  };
  if (!allowed[table]?.has(column)) throw new Error("Campo profesional no permitido");
  const result = await query(
    `SELECT ${column} AS value, COUNT(*)::int AS total
     FROM ${table}
     WHERE archived = FALSE AND COALESCE(${column}, '') <> ''
     GROUP BY ${column}
     HAVING COUNT(*) > 1
     ORDER BY total DESC, value ASC`
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
  if (String(password).length < 12) return res.status(400).json({ error: "La contrasena debe tener al menos 12 caracteres" });
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
  const userResult = await query("SELECT name FROM users WHERE id = $1 AND active = TRUE LIMIT 1", [req.params.id]);
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: "Tecnico no encontrado" });
  const assigned = await query(
    `SELECT COUNT(*)::int AS total FROM service_orders
     WHERE archived = FALSE AND status NOT IN ('Entregado','Cancelado')
       AND (raw_data->>'technicianId' = $1 OR lower(technician) = lower($2))`,
    [req.params.id, user.name]
  );
  if (assigned.rows[0]?.total > 0) {
    return res.status(409).json({ error: `Reasigna primero ${assigned.rows[0].total} orden(es) activas de este tecnico.` });
  }
  await query("UPDATE users SET active = FALSE WHERE id = $1", [req.params.id]);
  await audit(req.user.sub, "deactivate_user", "user", req.params.id, "");
  res.json({ ok: true });
});

app.post("/api/files/base64", requireAuth, requireRole("admin", "manager", "technician"), (_req, res) => {
  res.status(410).json({ error: "Carga evidencias mediante /api/files/evidence; el almacenamiento base64 fue retirado." });
});

app.post("/api/files/evidence", requireAuth, requireRole("admin", "manager", "technician"), async (req, res) => {
  if (!storageConfigured()) {
    return res.status(503).json({
      error: "Storage privado no configurado",
      code: "storage_not_configured",
      required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    });
  }
  const orderId = String(req.body?.orderId || "").trim();
  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!orderId) return res.status(400).json({ error: "orderId requerido" });
  if (!files.length || files.length > 6) return res.status(400).json({ error: "Adjunta entre 1 y 6 fotografias por carga" });
  await ensureEvidenceBucket();
  const photos = [];
  for (const file of files) photos.push(await uploadEvidencePhoto(orderId, file));
  await audit(req.user.sub, "evidence_upload", "order", orderId, `${photos.length} archivo(s)`);
  res.status(201).json({ photos });
});

app.get("/api/whatsapp/webhook", (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";
  if (req.query["hub.verify_token"] === verifyToken) return res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET || "";
  const signature = String(req.headers["x-hub-signature-256"] || "");
  if (!appSecret) return res.status(503).json({ error: "WHATSAPP_APP_SECRET no configurado" });
  const expectedSignature = `sha256=${createHmac("sha256", appSecret).update(req.rawBody || Buffer.alloc(0)).digest("hex")}`;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return res.status(401).json({ error: "Firma de webhook invalida" });
  }
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
  res.status(error?.status || 500).json({ error: error?.status ? error.message : "Error interno", code: error?.code || "internal_error" });
});

await initDb();
ensureEvidenceBucket().catch((error) => console.warn(`Storage de evidencias pendiente: ${error.message}`));

app.listen(port, () => {
  console.log(`PCFix backend Postgres listo en puerto ${port}`);
});
