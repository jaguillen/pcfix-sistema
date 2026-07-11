const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const port = Number(process.env.PORT || 8080);
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "pcfix_webhook_token";
const root = __dirname;
const inboxPath = path.join(root, "whatsapp-inbox.json");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function readInbox() {
  try {
    return JSON.parse(fs.readFileSync(inboxPath, "utf8"));
  } catch {
    return { messages: [] };
  }
}

function writeInbox(data) {
  fs.writeFileSync(inboxPath, JSON.stringify(data, null, 2));
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function collectBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
  });
}

function extractMessages(payload) {
  const found = [];
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  entries.forEach((entry) => {
    (entry.changes || []).forEach((change) => {
      const value = change.value || {};
      (value.messages || []).forEach((message) => {
        found.push({
          id: message.id,
          from: message.from,
          timestamp: message.timestamp,
          type: message.type,
          text: message.text?.body || message.button?.text || message.interactive?.button_reply?.title || "",
          raw: message,
          receivedAt: new Date().toISOString()
        });
      });
    });
  });
  return found;
}

function serveFile(reqPath, res) {
  const safePath = path.normalize(reqPath === "/" ? "/index.html" : reqPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath);
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, mime[path.extname(filePath)] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  if (parsed.pathname === "/api/whatsapp/webhook" && req.method === "GET") {
    const mode = parsed.query["hub.mode"];
    const token = parsed.query["hub.verify_token"];
    const challenge = parsed.query["hub.challenge"];
    if (mode === "subscribe" && token === verifyToken) {
      send(res, 200, challenge || "", "text/plain; charset=utf-8");
      return;
    }
    send(res, 403, "Token invalido", "text/plain; charset=utf-8");
    return;
  }

  if (parsed.pathname === "/api/whatsapp/webhook" && req.method === "POST") {
    try {
      const body = await collectBody(req);
      const payload = JSON.parse(body || "{}");
      const inbox = readInbox();
      inbox.messages.push(...extractMessages(payload));
      inbox.lastPayloadAt = new Date().toISOString();
      writeInbox(inbox);
      send(res, 200, JSON.stringify({ ok: true }));
    } catch (error) {
      send(res, 400, JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }

  if (parsed.pathname === "/api/whatsapp/messages" && req.method === "GET") {
    send(res, 200, JSON.stringify(readInbox()));
    return;
  }

  if (parsed.pathname === "/api/whatsapp/messages" && req.method === "DELETE") {
    writeInbox({ messages: [] });
    send(res, 200, JSON.stringify({ ok: true }));
    return;
  }

  serveFile(parsed.pathname, res);
});

server.listen(port, () => {
  console.log(`PCFIX listo en http://localhost:${port}`);
  console.log(`Webhook WhatsApp: http://localhost:${port}/api/whatsapp/webhook`);
});
