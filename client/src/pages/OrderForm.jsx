import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

const PRODUCTS = [
  "Stickers",
  "Banners",
  "Visiting cards",
  "Flex / Vinyl",
  "T-shirt print",
  "Other",
];

const METHODS = [
  { v: "cash", l: "Cash" },
  { v: "upi", l: "UPI" },
  { v: "bank", l: "Bank" },
  { v: "cheque", l: "Cheque" },
];

function money(n) {
  const x = Number(n) || 0;
  return "\u20B9" + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function OrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [customers, setCustomers] = useState([]);
  const [order, setOrder] = useState({
    customer_id: "",
    product_type: PRODUCTS[0],
    quantity: 1,
    cost_price: 0,
    selling_price: 0,
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: "",
    status: "pending",
    priority: "medium",
    notes: "",
  });
  const [payments, setPayments] = useState([]);
  const [err, setErr] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = METHODS[0].v;
  const [remTitle, setRemTitle] = useState("");
  const [remAt, setRemAt] = useState("");

  const q = Number(order.quantity) || 0;
  const cp = Number(order.cost_price) || 0;
  const sp = Number(order.selling_price) || 0;
  const totalCost = Math.round(q * cp * 100) / 100;
  const totalSell = Math.round(q * sp * 100) / 100;
  const profit = Math.round((totalSell - totalCost) * 100) / 100;

  useEffect(() => {
    api("/customers")
      .then(setCustomers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    api("/orders/" + id)
      .then((data) => {
        setOrder({
          customer_id: String(data.customer_id),
          product_type: data.product_type,
          quantity: data.quantity,
          cost_price: data.cost_price,
          selling_price: data.selling_price,
          order_date: data.order_date,
          delivery_date: data.delivery_date || "",
          status: data.status,
          priority: data.priority,
          notes: data.notes || "",
        });
        setPayments(data.payments || []);
      })
      .catch((e) => setErr(e.message));
  }, [id, isNew]);

  async function save(e) {
    e.preventDefault();
    setErr("");
    const body = {
      ...order,
      customer_id: Number(order.customer_id),
      quantity: Number(order.quantity),
      cost_price: Number(order.cost_price),
      selling_price: Number(order.selling_price),
      delivery_date: order.delivery_date || null,
    };
    try {
      if (isNew) {
        const created = await api("/orders", { method: "POST", body });
        navigate("/orders/" + created.id, { replace: true });
      } else {
        await api("/orders/" + id, { method: "PUT", body });
        const data = await api("/orders/" + id);
        setPayments(data.payments || []);
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addPayment(e) {
    e.preventDefault();
    if (isNew) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    setErr("");
    try {
      const data = await api("/payments/order/" + id, {
        method: "POST",
        body: { amount: amt, method: payMethod },
      });
      setPayments(data.payments || []);
      setPayAmount("");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function removePayment(pid) {
    if (!window.confirm("Remove this payment entry?")) return;
    try {
      const data = await api("/payments/" + pid, { method: "DELETE" });
      setPayments(data.payments || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addReminder(e) {
    e.preventDefault();
    if (!remTitle.trim() || !remAt) return;
    setErr("");
    try {
      await api("/reminders", {
        method: "POST",
        body: { order_id: isNew ? null : Number(id), title: remTitle, remind_at: remAt.replace("T", " ") },
      });
      setRemTitle("");
      setRemAt("");
      alert("Reminder saved.");
    } catch (e) {
      setErr(e.message);
    }
  }

  const received = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, Math.round((totalSell - received) * 100) / 100);
  let payLabel = "Pending";
  if (totalSell <= 0) payLabel = "Paid";
  else if (received >= totalSell - 0.01) payLabel = "Paid";
  else if (received > 0) payLabel = "Partial";

  return (
    <div>
      <p style={{ marginTop: 0 }}>
        <Link to="/orders">Back to orders</Link>
      </p>
      <h2>{isNew ? "New order / नया ऑर्डर" : "Edit order #" + id}</h2>

      {err && <p className="error-msg">{err}</p>}

      <form className="card form-grid" onSubmit={save}>
        <div className="form-grid two">
          <div>
            <label>
              Customer (ग्राहक) <span className="hint">required</span>
            </label>
            <select
              value={order.customer_id}
              onChange={(e) => setOrder({ ...order, customer_id: e.target.value })}
              required
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? "— " + c.phone : ""}
                </option>
              ))}
            </select>
            <p className="muted" style={{ marginBottom: 0 }}>
              <Link to="/customers">Add customer</Link>
            </p>
          </div>
          <div>
            <label>Product type (प्रोडक्ट)</label>
            <input
              type="text"
              list="product-suggestions"
              value={order.product_type}
              onChange={(e) => setOrder({ ...order, product_type: e.target.value })}
              required
            />
            <datalist id="product-suggestions">
              {PRODUCTS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="form-grid two">
          <div>
            <label>Quantity (मात्रा)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={order.quantity}
              onChange={(e) => setOrder({ ...order, quantity: e.target.value })}
              required
            />
          </div>
          <div className="form-grid two">
            <div>
              <label>Cost price / unit (CP)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={order.cost_price}
                onChange={(e) => setOrder({ ...order, cost_price: e.target.value })}
              />
            </div>
            <div>
              <label>Selling price / unit (SP)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={order.selling_price}
                onChange={(e) => setOrder({ ...order, selling_price: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{ background: "#f1f8f4", borderStyle: "dashed", margin: 0 }}
        >
          <strong>Auto totals</strong>
          <p className="muted" style={{ margin: "0.25rem 0" }}>
            Total cost: {money(totalCost)} · Total sell: {money(totalSell)} · Profit: {money(profit)}
          </p>
        </div>

        <div className="form-grid two">
          <div>
            <label>Order date</label>
            <input
              type="date"
              value={order.order_date}
              onChange={(e) => setOrder({ ...order, order_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Delivery date (optional)</label>
            <input
              type="date"
              value={order.delivery_date}
              onChange={(e) => setOrder({ ...order, delivery_date: e.target.value })}
            />
          </div>
        </div>

        <div className="form-grid two">
          <div>
            <label>Status</label>
            <select value={order.status} onChange={(e) => setOrder({ ...order, status: e.target.value })}>
              <option value="pending">Pending (पेंडिंग)</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed (पूरा)</option>
            </select>
          </div>
          <div>
            <label>Priority</label>
            <select value={order.priority} onChange={(e) => setOrder({ ...order, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent (जरूरी)</option>
            </select>
          </div>
        </div>

        <div>
          <label>Notes (optional)</label>
          <textarea value={order.notes} onChange={(e) => setOrder({ ...order, notes: e.target.value })} />
        </div>

        <button type="submit" className="btn btn-primary">
          {isNew ? "Save order" : "Update order"}
        </button>
      </form>

      {!isNew && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Payments / भुगतान</h3>
            <p className="muted">
              Bill total: {money(totalSell)} · Received: {money(received)} · Remaining: {money(remaining)} ·{" "}
              <strong>{payLabel}</strong>
            </p>
            <form className="toolbar" onSubmit={addPayment}>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.l}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary">
                Add payment
              </button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.paid_at}</td>
                      <td>{money(p.amount)}</td>
                      <td>{p.method}</td>
                      <td>
                        <button type="button" className="btn btn-secondary" onClick={() => removePayment(p.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Reminder for this order</h3>
            <form className="form-grid" onSubmit={addReminder}>
              <div>
                <label>Message</label>
                <input value={remTitle} onChange={(e) => setRemTitle(e.target.value)} placeholder="e.g. Deliver banner" />
              </div>
              <div>
                <label>Date and time</label>
                <input type="datetime-local" value={remAt} onChange={(e) => setRemAt(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-secondary">
                Save reminder
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
