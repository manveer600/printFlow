import { Router } from "express";
import db from "../db.js";
import { orderComputed, paymentStatusForOrder } from "../db.js";

const router = Router();

router.get("/stats", (req, res) => {
  const totalOrders = db.prepare("SELECT COUNT(*) AS c FROM orders").get().c;
  const pendingOrders = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'")
    .get().c;
  const inProgress = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'in_progress'")
    .get().c;
  const completedOrders = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'completed'")
    .get().c;

  const orders = db.prepare("SELECT * FROM orders").all();
  let totalRevenue = 0;
  let pendingPayments = 0;
  for (const o of orders) {
    const comp = orderComputed(o);
    totalRevenue += comp.total_selling;
    const received = db
      .prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE order_id = ?")
      .get(o.id).s;
    const ps = paymentStatusForOrder(o, received);
    if (ps !== "paid") {
      pendingPayments += Math.max(0, comp.total_selling - received);
    }
  }

  const urgent = db
    .prepare(
      `SELECT o.*, c.name AS customer_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.priority IN ('high','urgent') AND o.status != 'completed'
       ORDER BY CASE o.priority WHEN 'urgent' THEN 0 ELSE 1 END, o.delivery_date ASC, o.id DESC
       LIMIT 20`
    )
    .all();

  const recentOrders = db
    .prepare(
      `SELECT o.*, c.name AS customer_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       ORDER BY o.updated_at DESC, o.id DESC
       LIMIT 15`
    )
    .all();

  const recentPayments = db
    .prepare(
      `SELECT p.*, o.product_type, c.name AS customer_name
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       JOIN customers c ON c.id = o.customer_id
       ORDER BY p.paid_at DESC, p.id DESC
       LIMIT 15`
    )
    .all();

  res.json({
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    in_progress_orders: inProgress,
    completed_orders: completedOrders,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    pending_payments: Math.round(pendingPayments * 100) / 100,
    urgent_orders: urgent,
    recent_orders: recentOrders,
    recent_payments: recentPayments,
  });
});

router.get("/reports/daily", (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const orders = db
    .prepare(
      `SELECT o.*, c.name AS customer_name FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE date(o.order_date) = date(?)`
    )
    .all(date);
  const payments = db
    .prepare(
      `SELECT p.*, o.product_type FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE date(p.paid_at) = date(?)`
    )
    .all(date);
  let dayRevenue = 0;
  for (const p of payments) dayRevenue += Number(p.amount) || 0;
  res.json({
    date,
    orders,
    payments,
    day_collections: Math.round(dayRevenue * 100) / 100,
  });
});

router.get("/reports/monthly", (req, res) => {
  const ym = req.query.month || new Date().toISOString().slice(0, 7);
  const orders = db
    .prepare(
      `SELECT o.*, c.name AS customer_name FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE strftime('%Y-%m', o.order_date) = ?`
    )
    .all(ym);
  const payments = db
    .prepare(
      `SELECT p.*, o.product_type FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE strftime('%Y-%m', p.paid_at) = ?`
    )
    .all(ym);
  let collections = 0;
  for (const p of payments) collections += Number(p.amount) || 0;
  res.json({
    month: ym,
    orders,
    payments,
    month_collections: Math.round(collections * 100) / 100,
    order_count: orders.length,
  });
});

export default router;
