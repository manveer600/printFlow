import db from "./db.js";
import { orderComputed, paymentStatusForOrder } from "./db.js";

export function enrichOrderRow(o) {
  if (!o) return null;
  const comp = orderComputed(o);
  const received = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE order_id = ?")
    .get(o.id).s;
  const remaining = Math.max(0, Math.round((comp.total_selling - received) * 100) / 100);
  return {
    ...comp,
    amount_received: Math.round(received * 100) / 100,
    remaining,
    payment_status: paymentStatusForOrder(o, received),
  };
}

export function enrichOrderRows(rows) {
  return rows.map((o) => enrichOrderRow(o));
}
