import dotenv from "dotenv";
import { db, id, now } from "./db.js";
import { hashPassword } from "./auth.js";

dotenv.config();

const email = (process.env.ADMIN_EMAIL || "admin@pcfix.local").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "Cambiar123!";
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

if (existing) {
  console.log(`El usuario admin ya existe: ${email}`);
  process.exit(0);
}

const passwordHash = await hashPassword(password);
db.prepare("INSERT INTO users (id,name,email,password_hash,role,active,created_at) VALUES (?,?,?,?,?,?,?)")
  .run(id("usr"), "Administrador PCFix", email, passwordHash, "admin", 1, now());

console.log("Administrador creado");
console.log(`Email: ${email}`);
console.log(`Password temporal: ${password}`);
