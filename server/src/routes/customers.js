import { Router } from "express";
import db from "../db.js";
import { enrichOrderRow } from "../orderHelpers.js";

const router = Router();

router.get("/", (req, res) => {
  const q = (req.query.q || "").trim();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db
      .prepare(
        `SELECT * FROM customers 
         WHERE name LIKE ? OR phone LIKE ? OR IFNULL(address,'') LIKE ?
         ORDER BY name COLLATE NOCASE`
      )
      .all(like, like, like);
  } else {
    rows = db
      .prepare("SELECT * FROM customers ORDER BY name COLLATE NOCASE")
      .all();
  }
  res.json(rows);
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Customer not found" });
  const orders = db
    .prepare(
      "SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC, id DESC"
    )
    .all(id);
  const withPayments = orders.map((o) => enrichOrderRow(o));
  res.json({ ...row, orders: withPayments });
});

router.post("/", (req, res) => {
  const { name, phone, address } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  const r = db
    .prepare(
      "INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)"
    )
    .run(
      String(name).trim(),
      phone != null ? String(phone).trim() : null,
      address != null ? String(address).trim() : null
    );
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(r.lastInsertRowid);
  res.status(201).json(row);
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, address } = req.body || {};
  const existing = db.prepare("SELECT id FROM customers WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Customer not found" });
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  db.prepare(
    "UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?"
  ).run(
    String(name).trim(),
    phone != null ? String(phone).trim() : null,
    address != null ? String(address).trim() : null,
    id
  );
  res.json(db.prepare("SELECT * FROM customers WHERE id = ?").get(id));
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const count = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE customer_id = ?")
    .get(id).c;
  if (count > 0) {
    return res.status(400).json({
      error: "Cannot delete customer with orders. Remove or reassign orders first.",
    });
  }
  const r = db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  if (r.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
