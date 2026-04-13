import { Router } from "express";
import db from "../db.js";
import { enrichOrderRow, enrichOrderRows } from "../orderHelpers.js";

const router = Router();
const VALID_STATUS = new Set(["pending", "in_progress", "completed"]);
const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

router.get("/", (req, res) => {
  const q = (req.query.q || "").trim();
  const status = req.query.status ? String(req.query.status) : "";
  const priority = req.query.priority ? String(req.query.priority) : "";
  const payment_status = req.query.payment_status ? String(req.query.payment_status) : "";
  const date_from = req.query.date_from ? String(req.query.date_from) : "";
  const date_to = req.query.date_to ? String(req.query.date_to) : "";

  let sql =
    "SELECT o.*, c.name AS customer_name, c.phone AS customer_phone " +
    "FROM orders o JOIN customers c ON c.id = o.customer_id WHERE 1=1";
  const params = [];

  if (status && VALID_STATUS.has(status)) {
    sql += " AND o.status = ?";
    params.push(status);
  }
  if (priority && VALID_PRIORITY.has(priority)) {
    sql += " AND o.priority = ?";
    params.push(priority);
  }
  if (date_from) {
    sql += " AND o.order_date >= ?";
    params.push(date_from);
  }
  if (date_to) {
    sql += " AND o.order_date <= ?";
    params.push(date_to);
  }
  if (q) {
    const like = "%" + q + "%";
    sql +=
      " AND (CAST(o.id AS TEXT) LIKE ? OR o.product_type LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR IFNULL(o.notes,'') LIKE ?)";
    params.push(like, like, like, like, like);
  }

  sql += " ORDER BY o.order_date DESC, o.id DESC";
  const rows = db.prepare(sql).all(...params);
  let enriched = enrichOrderRows(rows);
  if (payment_status && ["paid", "partial", "pending"].includes(payment_status)) {
    enriched = enriched.filter((o) => o.payment_status === payment_status);
  }
  res.json(enriched);
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(
      "SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address " +
        "FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?"
    )
    .get(id);
  if (!row) return res.status(404).json({ error: "Order not found" });
  const payments = db
    .prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY paid_at DESC, id DESC")
    .all(id);
  res.json({ ...enrichOrderRow(row), payments });
});

router.post("/", (req, res) => {
  const body = req.body || {};
  const err = validateOrderBody(body);
  if (err) return res.status(400).json({ error: err });
  const r = db
    .prepare(
      "INSERT INTO orders (customer_id, product_type, quantity, cost_price, selling_price, " +
        "order_date, delivery_date, status, priority, notes) VALUES (?,?,?,?,?,?,?,?,?,?)"
    )
    .run(
      Number(body.customer_id),
      String(body.product_type).trim(),
      Number(body.quantity) || 0,
      Number(body.cost_price) || 0,
      Number(body.selling_price) || 0,
      String(body.order_date),
      body.delivery_date ? String(body.delivery_date) : null,
      VALID_STATUS.has(body.status) ? body.status : "pending",
      VALID_PRIORITY.has(body.priority) ? body.priority : "medium",
      body.notes != null ? String(body.notes) : null
    );
  const newId = r.lastInsertRowid;
  const row = db
    .prepare(
      "SELECT o.*, c.name AS customer_name, c.phone AS customer_phone " +
        "FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?"
    )
    .get(newId);
  res.status(201).json({ ...enrichOrderRow(row), payments: [] });
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Order not found" });
  const body = req.body || {};
  const err = validateOrderBody(body);
  if (err) return res.status(400).json({ error: err });
  db.prepare(
    "UPDATE orders SET customer_id=?, product_type=?, quantity=?, cost_price=?, selling_price=?, " +
      "order_date=?, delivery_date=?, status=?, priority=?, notes=?, updated_at=datetime('now') WHERE id=?"
  ).run(
    Number(body.customer_id),
    String(body.product_type).trim(),
    Number(body.quantity) || 0,
    Number(body.cost_price) || 0,
    Number(body.selling_price) || 0,
    String(body.order_date),
    body.delivery_date ? String(body.delivery_date) : null,
    VALID_STATUS.has(body.status) ? body.status : existing.status,
    VALID_PRIORITY.has(body.priority) ? body.priority : existing.priority,
    body.notes != null ? String(body.notes) : null,
    id
  );
  const row = db
    .prepare(
      "SELECT o.*, c.name AS customer_name, c.phone AS customer_phone " +
        "FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?"
    )
    .get(id);
  const payments = db
    .prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY paid_at DESC, id DESC")
    .all(id);
  res.json({ ...enrichOrderRow(row), payments });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const r = db.prepare("DELETE FROM orders WHERE id = ?").run(id);
  if (r.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

function validateOrderBody(body) {
  const cid = Number(body.customer_id);
  if (!cid) return "Customer is required";
  const cust = db.prepare("SELECT id FROM customers WHERE id = ?").get(cid);
  if (!cust) return "Customer not found";
  if (!body.product_type || !String(body.product_type).trim()) return "Product type is required";
  if (body.quantity == null || Number(body.quantity) < 0) return "Valid quantity is required";
  if (body.cost_price == null || Number(body.cost_price) < 0) return "Valid cost price is required";
  if (body.selling_price == null || Number(body.selling_price) < 0)
    return "Valid selling price is required";
  if (!body.order_date) return "Order date is required";
  if (body.status && !VALID_STATUS.has(body.status)) return "Invalid status";
  if (body.priority && !VALID_PRIORITY.has(body.priority)) return "Invalid priority";
  return null;
}

export default router;
