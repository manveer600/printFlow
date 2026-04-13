import { Router } from "express";
import db from "../db.js";
import { enrichOrderRow } from "../orderHelpers.js";

const router = Router();

const METHODS = new Set(["cash", "upi", "bank", "cheque"]);

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, o.product_type, o.status AS order_status, o.priority,
              c.name AS customer_name, c.phone AS customer_phone
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       JOIN customers c ON c.id = o.customer_id
       ORDER BY p.paid_at DESC, p.id DESC`
    )
    .all();
  res.json(rows);
});

router.post("/order/:orderId", (req, res) => {
  const orderId = Number(req.params.orderId);
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const { amount, method, paid_at } = req.body || {};
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Valid amount required" });
  const m = method && METHODS.has(String(method)) ? String(method) : "cash";
  const when = paid_at ? String(paid_at) : new Date().toISOString().slice(0, 19).replace("T", " ");

  db.prepare(
    "INSERT INTO payments (order_id, amount, method, paid_at) VALUES (?, ?, ?, ?)"
  ).run(orderId, amt, m, when);

  const row = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
    )
    .get(orderId);
  const payments = db
    .prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY paid_at DESC, id DESC")
    .all(orderId);
  res.status(201).json({ ...enrichOrderRow(row), payments });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const p = db.prepare("SELECT order_id FROM payments WHERE id = ?").get(id);
  if (!p) return res.status(404).json({ error: "Payment not found" });
  db.prepare("DELETE FROM payments WHERE id = ?").run(id);
  const orderId = p.order_id;
  const row = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
    )
    .get(orderId);
  const payments = db
    .prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY paid_at DESC, id DESC")
    .all(orderId);
  res.json({ ...enrichOrderRow(row), payments });
});

export default router;
