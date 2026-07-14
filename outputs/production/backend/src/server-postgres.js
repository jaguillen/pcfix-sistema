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
  "warrantyClaim"
]);

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
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

async function audit(userId, action, recordType, recordId, detail = "") {
  await query(
    "INSERT INTO audit_log (id,user_id,action,record_type,record_id,detail,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id("aud"), userId || null, action, recordType || null, recordId || null, detail, now()]
  );
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
  at: now()
}));

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
  const result = await query(
    "SELECT * FROM records WHERE type = $1 AND archived = FALSE AND lower(data->>'folio') = $2 LIMIT 1",
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
  const recordId = req.body?.id || record.id || id(type.slice(0, 3));
  const timestamp = now();
  const data = { ...record, id: recordId };
  const existing = await query("SELECT id FROM records WHERE id = $1", [recordId]);
  await query(
    `INSERT INTO records (id,type,data,archived,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, archived = EXCLUDED.archived, updated_at = EXCLUDED.updated_at`,
    [recordId, type, JSON.stringify(data), Boolean(record.archived), timestamp, timestamp]
  );
  await audit(req.user.sub, existing.rows.length ? "update" : "create", type, recordId, req.body?.detail || "");
  res.status(existing.rows.length ? 200 : 201).json({ id: recordId, data });
});

app.post("/api/records/:type/:id/archive", requireAuth, requireRole("admin", "manager"), async (req, res) => {
  const { type, id: recordId } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  await query("UPDATE records SET archived = TRUE, updated_at = $1 WHERE id = $2 AND type = $3", [now(), recordId, type]);
  await audit(req.user.sub, "archive", type, recordId, req.body?.detail || "");
  res.json({ ok: true });
});

app.get("/api/audit", requireAuth, requireRole("admin", "manager"), async (_req, res) => {
  const result = await query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 250");
  res.json(result.rows);
});

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
