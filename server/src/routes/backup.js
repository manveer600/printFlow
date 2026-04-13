import { Router } from "express";
import db from "../db.js";

const router = Router();

function syncAutoIncrement(tableName) {
  const maxRow = db.prepare("SELECT MAX(id) AS m FROM " + tableName).get();
  const maxId = maxRow && maxRow.m != null ? maxRow.m : 0;
  const row = db
    .prepare("SELECT seq FROM sqlite_sequence WHERE name = ?")
    .get(tableName);
  if (row) {
    db.prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = ?").run(
      maxId,
      tableName
    );
  } else if (maxId > 0) {
    db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)").run(
      tableName,
      maxId
    );
  }
}

router.get("/export.json", (req, res) => {
  const customers = db.prepare("SELECT * FROM customers").all();
  const orders = db.prepare("SELECT * FROM orders").all();
  const payments = db.prepare("SELECT * FROM payments").all();
  const reminders = db.prepare("SELECT * FROM reminders").all();
  const settings = db.prepare("SELECT * FROM settings").all();
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    customers,
    orders,
    payments,
    reminders,
    settings,
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="printflow-backup.json"'
  );
  res.send(JSON.stringify(payload, null, 2));
});

router.post("/import.json", (req, res) => {
  const body = req.body;
  if (!body || !Array.isArray(body.customers) || !Array.isArray(body.orders)) {
    return res.status(400).json({ error: "Invalid backup file format" });
  }

  const txn = db.transaction(() => {
    db.prepare("DELETE FROM payments").run();
    db.prepare("DELETE FROM reminders").run();
    db.prepare("DELETE FROM orders").run();
    db.prepare("DELETE FROM customers").run();

    const insC = db.prepare(
      "INSERT INTO customers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    for (const c of body.customers) {
      insC.run(
        c.id,
        c.name,
        c.phone ?? null,
        c.address ?? null,
        c.created_at || new Date().toISOString()
      );
    }

    const insO = db.prepare(
      `INSERT INTO orders (
        id, customer_id, product_type, quantity, cost_price, selling_price,
        order_date, delivery_date, status, priority, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const o of body.orders) {
      insO.run(
        o.id,
        o.customer_id,
        o.product_type,
        o.quantity,
        o.cost_price,
        o.selling_price,
        o.order_date,
        o.delivery_date ?? null,
        o.status || "pending",
        o.priority || "medium",
        o.notes ?? null,
        o.created_at || new Date().toISOString(),
        o.updated_at || new Date().toISOString()
      );
    }

    if (Array.isArray(body.payments)) {
      const insP = db.prepare(
        "INSERT INTO payments (id, order_id, amount, method, paid_at) VALUES (?, ?, ?, ?, ?)"
      );
      for (const p of body.payments) {
        insP.run(p.id, p.order_id, p.amount, p.method || "cash", p.paid_at);
      }
    }

    if (Array.isArray(body.reminders)) {
      const insR = db.prepare(
        "INSERT INTO reminders (id, order_id, title, remind_at, is_done, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const r of body.reminders) {
        insR.run(
          r.id,
          r.order_id ?? null,
          r.title,
          r.remind_at,
          r.is_done ? 1 : 0,
          r.created_at || new Date().toISOString()
        );
      }
    }

    if (Array.isArray(body.settings)) {
      const insS = db.prepare(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
      );
      for (const s of body.settings) {
        insS.run(s.key, s.value);
      }
    }

    syncAutoIncrement("customers");
    syncAutoIncrement("orders");
    syncAutoIncrement("payments");
    syncAutoIncrement("reminders");
  });

  try {
    txn();
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: "Import failed: " + e.message });
  }

  res.json({ ok: true, message: "Data restored. Please refresh the app." });
});

export default router;
