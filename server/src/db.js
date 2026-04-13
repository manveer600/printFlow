import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "printflow.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    product_type TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    cost_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0,
    order_date TEXT NOT NULL,
    delivery_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'cash',
    paid_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    remind_at TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
  CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
  CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(remind_at);
`);

const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(
    "admin",
    hash
  );
}

const defaultSettings = {
  reminderSound: "true",
  reminderBrowserNotify: "true",
  languageNote: "hi-en",
};
const insSetting = db.prepare(
  "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
);
for (const [k, v] of Object.entries(defaultSettings)) {
  insSetting.run(k, v);
}

export function orderComputed(row) {
  if (!row) return null;
  const q = Number(row.quantity) || 0;
  const cp = Number(row.cost_price) || 0;
  const sp = Number(row.selling_price) || 0;
  const totalCost = q * cp;
  const totalSelling = q * sp;
  const profit = totalSelling - totalCost;
  return {
    ...row,
    total_cost: Math.round(totalCost * 100) / 100,
    total_selling: Math.round(totalSelling * 100) / 100,
    profit: Math.round(profit * 100) / 100,
  };
}

export function paymentStatusForOrder(orderRow, received) {
  const total = orderComputed(orderRow).total_selling;
  const rec = Number(received) || 0;
  const eps = 0.01;
  if (total <= 0) return "paid";
  if (rec + eps >= total) return "paid";
  if (rec > eps) return "partial";
  return "pending";
}

export default db;
