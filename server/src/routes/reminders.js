import { Router } from "express";
import db from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const upcoming = req.query.upcoming === "1";
  let sql = `
    SELECT r.*, o.product_type, c.name AS customer_name
    FROM reminders r
    LEFT JOIN orders o ON o.id = r.order_id
    LEFT JOIN customers c ON c.id = o.customer_id
  `;
  if (upcoming) {
    sql += ` WHERE r.is_done = 0 AND r.remind_at <= datetime('now', '+1 day') 
             ORDER BY r.remind_at ASC`;
  } else {
    sql += " ORDER BY r.remind_at DESC, r.id DESC";
  }
  const rows = db.prepare(sql).all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const { order_id, title, remind_at } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!remind_at) return res.status(400).json({ error: "Date & time required" });

  let oid = null;
  if (order_id != null && order_id !== "") {
    oid = Number(order_id);
    const o = db.prepare("SELECT id FROM orders WHERE id = ?").get(oid);
    if (!o) return res.status(400).json({ error: "Order not found" });
  }

  const r = db
    .prepare(
      "INSERT INTO reminders (order_id, title, remind_at) VALUES (?, ?, ?)"
    )
    .run(oid, String(title).trim(), normalizeDateTime(remind_at));

  const row = db
    .prepare(
      `SELECT r.*, o.product_type, c.name AS customer_name
       FROM reminders r
       LEFT JOIN orders o ON o.id = r.order_id
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE r.id = ?`
    )
    .get(r.lastInsertRowid);
  res.status(201).json(row);
});

router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { is_done, title, remind_at } = req.body || {};
  const existing = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const titleF = title != null ? String(title).trim() : existing.title;
  const timeF =
    remind_at != null ? normalizeDateTime(remind_at) : existing.remind_at;
  const doneF =
    is_done != null ? (is_done ? 1 : 0) : existing.is_done;

  db.prepare(
    "UPDATE reminders SET title = ?, remind_at = ?, is_done = ? WHERE id = ?"
  ).run(titleF, timeF, doneF, id);

  const row = db
    .prepare(
      `SELECT r.*, o.product_type, c.name AS customer_name
       FROM reminders r
       LEFT JOIN orders o ON o.id = r.order_id
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE r.id = ?`
    )
    .get(id);
  res.json(row);
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const r = db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
  if (r.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

function normalizeDateTime(s) {
  const str = String(s).trim();
  if (str.includes("T") && !str.includes(" ")) {
    return str.replace("T", " ").slice(0, 19);
  }
  return str;
}

export default router;
