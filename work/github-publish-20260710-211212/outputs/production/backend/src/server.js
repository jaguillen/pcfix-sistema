import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { db, id, now, parseJson } from "./db.js";
import { getUserByEmail, hashPassword, requireAuth, requireRole, signToken, verifyPassword } from "./auth.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8080);
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${id("file")}${path.extname(file.originalname || "")}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/") || file.mimetype === "application/pdf")
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "4mb" }));
app.use("/uploads", requireAuth, express.static(uploadDir));

function audit(userId, action, recordType, recordId, detail = "") {
  db.prepare(
    "INSERT INTO audit_log (id,user_id,action,record_type,record_id,detail,created_at) VALUES (?,?,?,?,?,?,?)"
  ).run(id("aud"), userId || null, action, recordType || null, recordId || null, detail, now());
}

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

app.get(["/", "/health", "/api/health"], (_req, res) => res.json({
  ok: true,
  service: "PCFix backend",
  mode: "sqlite",
  login: "/api/auth/login",
  health: "/api/health",
  at: now()
}));

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = getUserByEmail(String(email || "").toLowerCase());
  if (!user || !(await verifyPassword(String(password || ""), user.password_hash))) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }
  audit(user.id, "login", "user", user.id, "Inicio de sesion");
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/public/orders/:folio", (req, res) => {
  const folio = String(req.params.folio || "").toLowerCase();
  const row = db.prepare("SELECT * FROM records WHERE type = ? AND archived = 0").all("order")
    .find((record) => String(parseJson(record.data, {})?.folio || "").toLowerCase() === folio);
  if (!row) return res.status(404).json({ error: "Orden no encontrada" });
  const order = parseJson(row.data, {});
  const clientRow = db.prepare("SELECT * FROM records WHERE type = ? AND id = ? AND archived = 0").get("client", order.clientId);
  const client = clientRow ? parseJson(clientRow.data, {}) : null;
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
      statusHistory: order.statusHistory || []
    },
    client: {
      name: client?.name || "Cliente"
    }
  });
});

app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));

app.get("/api/records/:type", requireAuth, (req, res) => {
  const { type } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  const includeArchived = req.query.archived === "1";
  const rows = db.prepare(
    `SELECT * FROM records WHERE type = ? ${includeArchived ? "" : "AND archived = 0"} ORDER BY updated_at DESC`
  ).all(type);
  res.json(rows.map((row) => ({ ...row, data: parseJson(row.data, {}) })));
});

app.post("/api/records/:type", requireAuth, requireRole("admin", "manager", "technician"), (req, res) => {
  const { type } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  const record = req.body?.data || {};
  const recordId = req.body?.id || record.id || id(type.slice(0, 3));
  const timestamp = now();
  const existing = db.prepare("SELECT id FROM records WHERE id = ?").get(recordId);
  if (existing) {
    db.prepare("UPDATE records SET data = ?, archived = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify({ ...record, id: recordId }), record.archived ? 1 : 0, timestamp, recordId);
    audit(req.user.sub, "update", type, recordId, req.body?.detail || "");
  } else {
    db.prepare("INSERT INTO records (id,type,data,archived,created_at,updated_at) VALUES (?,?,?,?,?,?)")
      .run(recordId, type, JSON.stringify({ ...record, id: recordId }), record.archived ? 1 : 0, timestamp, timestamp);
    audit(req.user.sub, "create", type, recordId, req.body?.detail || "");
  }
  res.status(existing ? 200 : 201).json({ id: recordId, data: { ...record, id: recordId } });
});

app.post("/api/records/:type/:id/archive", requireAuth, requireRole("admin", "manager"), (req, res) => {
  const { type, id: recordId } = req.params;
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Tipo no permitido" });
  db.prepare("UPDATE records SET archived = 1, updated_at = ? WHERE id = ? AND type = ?").run(now(), recordId, type);
  audit(req.user.sub, "archive", type, recordId, req.body?.detail || "");
  res.json({ ok: true });
});

app.post("/api/files/:recordId", requireAuth, requireRole("admin", "manager", "technician"), upload.array("files", 8), (req, res) => {
  const recordId = req.params.recordId;
  const rows = (req.files || []).map((file) => {
    const fileId = id("fil");
    db.prepare(
      "INSERT INTO files (id,record_id,original_name,stored_name,mime_type,size,created_at) VALUES (?,?,?,?,?,?,?)"
    ).run(fileId, recordId, file.originalname, file.filename, file.mimetype, file.size, now());
    return { id: fileId, recordId, name: file.originalname, url: `/uploads/${file.filename}` };
  });
  audit(req.user.sub, "upload", "file", recordId, `${rows.length} archivo(s)`);
  res.status(201).json({ files: rows });
});

app.get("/api/audit", requireAuth, requireRole("admin", "manager"), (_req, res) => {
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 250").all();
  res.json(rows);
});

app.get("/api/users", requireAuth, requireRole("admin", "manager"), (_req, res) => {
  const rows = db.prepare("SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC").all();
  res.json(rows.map((row) => ({ ...row, active: Boolean(row.active), createdAt: row.created_at })));
});

app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, email, password, role = "technician" } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Nombre, email y password son requeridos" });
  if (!["admin", "manager", "technician", "viewer"].includes(role)) return res.status(400).json({ error: "Rol invalido" });
  const userId = id("usr");
  try {
    db.prepare("INSERT INTO users (id,name,email,password_hash,role,active,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(userId, name, String(email).toLowerCase(), await hashPassword(password), role, 1, now());
    audit(req.user.sub, "create_user", "user", userId, email);
    res.status(201).json({ id: userId, name, email: String(email).toLowerCase(), role, active: true });
  } catch {
    res.status(409).json({ error: "Email ya registrado" });
  }
});

app.post("/api/users/:id/deactivate", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(req.params.id);
  audit(req.user.sub, "deactivate_user", "user", req.params.id, "");
  res.json({ ok: true });
});

app.get("/api/whatsapp/webhook", (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";
  if (req.query["hub.verify_token"] === verifyToken) return res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

app.post("/api/whatsapp/webhook", (req, res) => {
  const payload = req.body || {};
  const messages = payload.entry?.flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.messages || []) || [];
  for (const message of messages) {
    db.prepare("INSERT INTO whatsapp_messages (id,direction,phone,text,payload,status,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(id("wam"), "in", message.from || "", message.text?.body || "", JSON.stringify(message), "received", now());
  }
  res.json({ ok: true });
});

app.post("/api/whatsapp/send", requireAuth, requireRole("admin", "manager", "technician"), async (req, res) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const { to, text } = req.body || {};
  if (!token || !phoneNumberId) return res.status(400).json({ error: "Configura WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID" });
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: String(to || "").replace(/\\D/g, ""),
      type: "text",
      text: { preview_url: false, body: String(text || "") }
    })
  });
  const payload = await response.json();
  db.prepare("INSERT INTO whatsapp_messages (id,direction,phone,text,payload,status,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id("wam"), "out", to, text, JSON.stringify(payload), response.ok ? "sent" : "error", now());
  audit(req.user.sub, "whatsapp_send", "whatsapp", to, response.ok ? "Enviado" : "Error");
  res.status(response.ok ? 200 : 502).json(payload);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Error interno" });
});

app.listen(port, () => {
  console.log(`PCFix backend listo en http://localhost:${port}`);
});
