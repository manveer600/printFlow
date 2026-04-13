import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";

function money(n) {
  const x = Number(n) || 0;
  return "₹" + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function priorityClass(p) {
  if (p === "urgent") return "badge-urgent";
  if (p === "high") return "badge-high";
  if (p === "low") return "badge-low";
  return "badge-medium";
}

function statusClass(s) {
  if (s === "completed") return "badge-completed";
  if (s === "in_progress") return "badge-in_progress";
  return "badge-pending";
}

function payClass(ps) {
  if (ps === "paid") return "badge-paid";
  if (ps === "partial") return "badge-partial";
  return "badge-payment-pending";
}

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [err, setErr] = useState("");

  function buildQuery() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    if (priority) p.set("priority", priority);
    if (paymentStatus) p.set("payment_status", paymentStatus);
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    const s = p.toString();
    return s ? "?" + s : "";
  }

  function load() {
    setErr("");
    api("/orders" + buildQuery())
      .then(setList)
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    if (searchParams.has("q")) setQ(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, priority, paymentStatus, dateFrom, dateTo]);

  function searchSubmit(e) {
    e.preventDefault();
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, flex: "1 1 auto" }}>Orders / ऑर्डर</h2>
        <Link className="btn btn-primary" to="/orders/new">
          + New order
        </Link>
      </div>

      <form className="card toolbar" onSubmit={searchSubmit}>
        <input
          type="search"
          placeholder="Search: name, phone, product, order #"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="">All payments</option>
          <option value="pending">Payment pending</option>
          <option value="partial">Partially paid</option>
          <option value="paid">Paid</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </form>

      {err && <p className="error-msg">{err}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Profit</th>
              <th>Pay</th>
              <th>Status</th>
              <th>Pri</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr
                key={o.id}
                className={
                  o.priority === "urgent"
                    ? "row-urgent"
                    : o.status === "completed"
                      ? "row-ok"
                      : "row-pending"
                }
              >
                <td>
                  <Link to={"/orders/" + o.id}>#{o.id}</Link>
                </td>
                <td>{o.customer_name}</td>
                <td>{o.product_type}</td>
                <td>{o.quantity}</td>
                <td>{money(o.total_selling)}</td>
                <td>{money(o.profit)}</td>
                <td>
                  <span className={"badge " + payClass(o.payment_status)}>{o.payment_status}</span>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>
                    Due {money(o.remaining)}
                  </div>
                </td>
                <td>
                  <span className={"badge " + statusClass(o.status)}>{o.status.replace("_", " ")}</span>
                </td>
                <td>
                  <span className={"badge " + priorityClass(o.priority)}>{o.priority}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="muted">No orders match.</p>}
      </div>
    </div>
  );
}
