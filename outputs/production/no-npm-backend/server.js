const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const port = Number(process.env.PORT || 8080);
const baseDir = __dirname;
const dataDir = process.env.DATA_DIR || path.join(baseDir, "data");
const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, "uploads");
const backupDir = path.join(dataDir, "backups");
const dbPath = path.join(dataDir, "pcfix-data.json");
const jwtSecret = process.env.JWT_SECRET || "pcfix-cambiar-clave";

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

const defaultDb = {
  users: [],
  records: {},
  files: [],
  auditLog: [],
  whatsappMessages: []
};

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function readDb() {
  if (!fs.existsSync(dbPath)) {
    const admin = createUser("Administrador PCFix", "admin@pcfix.local", "Cambiar123!", "admin");
    const db = { ...defaultDb, users: [admin] };
    writeDb(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  const payload = JSON.stringify(db, null, 2);
  const tmpPath = `${dbPath}.tmp`;
  fs.writeFileSync(tmpPath, payload);
  if (fs.existsSync(dbPath)) {
    const backupPath = path.join(backupDir, `pcfix-data-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.copyFileSync(dbPath, backupPath);
    pruneBackups();
  }
  fs.renameSync(tmpPath, dbPath);
}

function pruneBackups() {
  const backups = fs.readdirSync(backupDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({ name, path: path.join(backupDir, name), time: fs.statSync(path.join(backupDir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  backups.slice(30).forEach((backup) => fs.unlinkSync(backup.path));
}

function createUser(name, email, password, role) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { id: id("usr"), name, email: email.toLowerCase(), salt, passwordHash, role, active: true, createdAt: now() };
}

function verifyPassword(password, user) {
  const hash = crypto.scryptSync(password, user.salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signToken(user) {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const payload = base64url({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
  });
  const signature = crypto.createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function verifyToken(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return null;
  const expected = crypto.createHmac("sha256", jwtSecret).update(`${h}.${p}`).digest("base64url");
  if (s !== expected) return null;
  const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function send(res, status, data, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", ...headers });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) reject(new Error("Body demasiado grande"));
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON invalido"));
      }
    });
  });
}

function audit(db, user, action, recordType, recordId, detail = "") {
  db.auditLog.unshift({ id: id("aud"), userId: user?.sub || null, action, recordType, recordId, detail, createdAt: now() });
  db.auditLog = db.auditLog.slice(0, 300);
}

const allowedTypes = new Set(["settings", "client", "order", "inventory", "supplier", "appointment", "purchase", "payment", "inventoryMovement", "warrantyClaim"]);

function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    send(res, 401, { error: "Token requerido o invalido" });
    return null;
  }
  return user;
}

function requireRole(user, res, roles) {
  if (!roles.includes(user.role)) {
    send(res, 403, { error: "Permiso insuficiente" });
    return false;
  }
  return true;
}

async function handle(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const db = readDb();

  if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health") {
    return send(res, 200, {
      ok: true,
      service: "PCFix backend",
      mode: "no-npm",
      login: "/api/auth/login",
      health: "/api/health",
      at: now()
    });
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const user = db.users.find((item) => item.email === String(body.email || "").toLowerCase() && item.active);
    if (!user || !verifyPassword(String(body.password || ""), user)) return send(res, 401, { error: "Credenciales invalidas" });
    audit(db, { sub: user.id }, "login", "user", user.id, "Inicio de sesion");
    writeDb(db);
    return send(res, 200, { token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  const publicOrderMatch = url.pathname.match(/^\/api\/public\/orders\/([^/]+)$/);
  if (publicOrderMatch && req.method === "GET") {
    const folio = decodeURIComponent(publicOrderMatch[1]).trim().toLowerCase();
    const orders = Object.values(db.records.order || {}).map((row) => row.data || row);
    const order = orders.find((item) => !item.archived && String(item.folio || "").toLowerCase() === folio);
    if (!order) return send(res, 404, { error: "Orden no encontrada" });
    const clients = Object.values(db.records.client || {}).map((row) => row.data || row);
    const client = clients.find((item) => item.id === order.clientId);
    return send(res, 200, {
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
      client: {
        name: client?.name || "Cliente"
      }
    });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  if (url.pathname === "/api/me") return send(res, 200, { user });

  if (url.pathname === "/api/audit") {
    if (!requireRole(user, res, ["admin", "manager"])) return;
    return send(res, 200, db.auditLog || []);
  }

  if (url.pathname === "/api/users" && req.method === "GET") {
    if (!requireRole(user, res, ["admin", "manager"])) return;
    return send(res, 200, db.users.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      role: item.role,
      active: item.active,
      createdAt: item.createdAt
    })));
  }

  if (url.pathname === "/api/users" && req.method === "POST") {
    if (!requireRole(user, res, ["admin"])) return;
    const body = await readBody(req);
    const email = String(body.email || "").toLowerCase().trim();
    const role = String(body.role || "technician");
    if (!body.name || !email || !body.password) return send(res, 400, { error: "Nombre, email y password son requeridos" });
    if (!["admin", "manager", "technician", "viewer"].includes(role)) return send(res, 400, { error: "Rol invalido" });
    if (db.users.some((item) => item.email === email)) return send(res, 409, { error: "Email ya registrado" });
    const newUser = createUser(String(body.name), email, String(body.password), role);
    db.users.push(newUser);
    audit(db, user, "create_user", "user", newUser.id, email);
    writeDb(db);
    return send(res, 201, { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, active: true });
  }

  const deactivateUserMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/deactivate$/);
  if (deactivateUserMatch && req.method === "POST") {
    if (!requireRole(user, res, ["admin"])) return;
    const userId = deactivateUserMatch[1];
    db.users = db.users.map((item) => item.id === userId ? { ...item, active: false } : item);
    audit(db, user, "deactivate_user", "user", userId, "");
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  const recordsMatch = url.pathname.match(/^\/api\/records\/([^/]+)$/);
  if (recordsMatch && req.method === "GET") {
    const type = recordsMatch[1];
    if (!allowedTypes.has(type)) return send(res, 400, { error: "Tipo no permitido" });
    const rows = Object.values(db.records[type] || {});
    const includeArchived = url.searchParams.get("archived") === "1";
    return send(res, 200, rows.filter((record) => includeArchived || !record.archived));
  }

  if (recordsMatch && req.method === "POST") {
    if (!requireRole(user, res, ["admin", "manager", "technician"])) return;
    const type = recordsMatch[1];
    if (!allowedTypes.has(type)) return send(res, 400, { error: "Tipo no permitido" });
    const body = await readBody(req);
    const record = body.data || {};
    const recordId = body.id || record.id || id(type.slice(0, 3));
    db.records[type] ||= {};
    const existing = db.records[type][recordId];
    db.records[type][recordId] = {
      ...record,
      id: recordId,
      archived: Boolean(record.archived),
      createdAt: existing?.createdAt || now(),
      updatedAt: now()
    };
    audit(db, user, existing ? "update" : "create", type, recordId, body.detail || "");
    writeDb(db);
    return send(res, existing ? 200 : 201, db.records[type][recordId]);
  }

  const archiveMatch = url.pathname.match(/^\/api\/records\/([^/]+)\/([^/]+)\/archive$/);
  if (archiveMatch && req.method === "POST") {
    if (!requireRole(user, res, ["admin", "manager"])) return;
    const [, type, recordId] = archiveMatch;
    if (db.records[type]?.[recordId]) {
      db.records[type][recordId].archived = true;
      db.records[type][recordId].updatedAt = now();
      audit(db, user, "archive", type, recordId, "");
      writeDb(db);
    }
    return send(res, 200, { ok: true });
  }

  if (url.pathname === "/api/files/base64" && req.method === "POST") {
    if (!requireRole(user, res, ["admin", "manager", "technician"])) return;
    const body = await readBody(req);
    const buffer = Buffer.from(String(body.data || ""), "base64");
    const extension = String(body.name || "file.bin").split(".").pop() || "bin";
    const storedName = `${id("file")}.${extension}`;
    fs.writeFileSync(path.join(uploadDir, storedName), buffer);
    const file = { id: id("fil"), recordId: body.recordId || "", name: body.name || storedName, storedName, mimeType: body.mimeType || "", size: buffer.length, createdAt: now() };
    db.files.push(file);
    audit(db, user, "upload", "file", body.recordId || "", file.name);
    writeDb(db);
    return send(res, 201, file);
  }

  if (url.pathname === "/api/whatsapp/send" && req.method === "POST") {
    if (!requireRole(user, res, ["admin", "manager", "technician"])) return;
    const body = await readBody(req);
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) return send(res, 400, { error: "Configura WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID" });
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: String(body.to || "").replace(/\D/g, ""), type: "text", text: { body: String(body.text || "") } })
    });
    const payload = await response.json();
    db.whatsappMessages.unshift({ id: id("wam"), direction: "out", phone: body.to, text: body.text, payload, status: response.ok ? "sent" : "error", createdAt: now() });
    audit(db, user, "whatsapp_send", "whatsapp", body.to, response.ok ? "Enviado" : "Error");
    writeDb(db);
    return send(res, response.ok ? 200 : 502, payload);
  }

  send(res, 404, { error: "Ruta no encontrada" });
}

http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(error);
    send(res, 500, { error: "Error interno", detail: error.message });
  });
}).listen(port, () => {
  console.log(`PCFix backend sin npm listo: http://localhost:${port}`);
  console.log("Admin inicial: admin@pcfix.local / Cambiar123!");
});
