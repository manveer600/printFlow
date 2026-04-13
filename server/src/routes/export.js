import { Router } from "express";
import db from "../db.js";
import { enrichOrderRows } from "../orderHelpers.js";
import XLSX from "xlsx";
import PDFDocument from "pdfkit";

const router = Router();

router.get("/orders.xlsx", (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
       FROM orders o JOIN customers c ON c.id = o.customer_id
       ORDER BY o.id DESC`
    )
    .all();
  const enriched = enrichOrderRows(rows);
  const data = enriched.map((o) => ({
    OrderID: o.id,
    Customer: o.customer_name,
    Phone: o.customer_phone,
    Product: o.product_type,
    Qty: o.quantity,
    CP: o.cost_price,
    SP: o.selling_price,
    TotalCost: o.total_cost,
    TotalSell: o.total_selling,
    Profit: o.profit,
    OrderDate: o.order_date,
    DeliveryDate: o.delivery_date || "",
    Status: o.status,
    Priority: o.priority,
    Received: o.amount_received,
    Remaining: o.remaining,
    Payment: o.payment_status,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="printflow-orders.xlsx"'
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.send(buf);
});

router.get("/orders.pdf", (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
       FROM orders o JOIN customers c ON c.id = o.customer_id
       ORDER BY o.id DESC LIMIT 200`
    )
    .all();
  const enriched = enrichOrderRows(rows);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="printflow-orders.pdf"'
  );
  doc.pipe(res);
  doc.fontSize(18).text("PrintFlow Manager — Orders", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#444").text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown();
  doc.fillColor("#000");

  enriched.forEach((o) => {
    if (doc.y > 720) {
      doc.addPage();
    }
    doc.fontSize(10).text(`#${o.id} — ${o.customer_name} (${o.customer_phone || "-"})`);
    doc.fontSize(9).fillColor("#333");
    doc.text(
      `${o.product_type} | Qty ${o.quantity} | Sell Rs.${o.total_selling} | Paid: ${o.payment_status} | ${o.status} | ${o.priority}`
    );
    doc.fillColor("#000").moveDown(0.3);
  });
  doc.end();
});

export default router;
