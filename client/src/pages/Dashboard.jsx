import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function money(n) {
  const x = Number(n) || 0;
  return "\u20B9" + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/dashboard/stats")
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="card error-msg">{err}</div>;
  if (!stats) return <div className="card muted">Loading</div>;

  const urgent = stats.urgent_orders || [];
  const recentOrders = stats.recent_orders || [];
  const recentPay = stats.recent_payments || [];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <p className="muted">Overview / सारांश</p>

      <div className="grid-stats" style={{ marginBottom: "1rem" }}>
        <div className="stat">
          <span className="num">{stats.total_orders}</span>
          <span className="lbl">Total orders</span>
        </div>
        <div
          className="stat"
          style={{ borderColor: "var(--pending)", borderWidth: 1, borderStyle: "solid" }}
        >
          <span className="num" style={{ color: "var(--pending)" }}>
            {stats.pending_orders}
          </span>
          <span className="lbl">Pending</span>
        </div>
        <div className="stat">
          <span className="num">{stats.in_progress_orders}</span>
          <span className="lbl">In progress</span>
        </div>
        <div
          className="stat"
          style={{ borderColor: "var(--ok)", borderWidth: 1, borderStyle: "solid" }}
        >
          <span className="num" style={{ color: "var(--ok)" }}>
            {stats.completed_orders}
          </span>
          <span className="lbl">Completed</span>
        </div>
        <div className="stat">
          <span className="num">{money(stats.total_revenue)}</span>
          <span className="lbl">Total bill</span>
        </div>
        <div
          className="stat"
          style={{ borderColor: "var(--pending)", borderWidth: 1, borderStyle: "solid" }}
        >
          <span className="num" style={{ color: "#e65100" }}>
            {money(stats.pending_payments)}
          </span>
          <span className="lbl">Pending payments</span>
        </div>
      </div>

      {urgent.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid var(--urgent)" }}>
          <h3 style={{ marginTop: 0, color: "var(--urgent)" }}>Urgent / जरूरी</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Pri</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {urgent.map((o) => (
                  <tr key={o.id} className="row-urgent">
                    <td>#{o.id}</td>
                    <td>{o.customer_name}</td>
                    <td>{o.product_type}</td>
                    <td>
                      <span className={"badge " + priorityClass(o.priority)}>{o.priority}</span>
                    </td>
                    <td>
                      <Link to={"/orders/" + o.id}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent orders</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr
                  key={o.id}
                  className={
                    o.priority === "urgent" || o.priority === "high"
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
                  <td>
                    <span className={"badge " + statusClass(o.status)}>
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent payments</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {recentPay.map((p) => (
                <tr key={p.id}>
                  <td>{p.paid_at}</td>
                  <td>{p.customer_name}</td>
                  <td>{money(p.amount)}</td>
                  <td>{p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="muted">
        <Link to="/orders/new">+ New order</Link>
        {" · "}
        <Link to="/settings">Reports and export</Link>
      </p>
    </div>
  );
}
