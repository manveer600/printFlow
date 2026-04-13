import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

function money(n) {
  const x = Number(n) || 0;
  return "\u20B9" + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function Payments() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/payments")
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Payments / भुगतान</h2>
      <p className="muted">All payment entries. Add new payments from each order page.</p>
      <p>
        <Link className="btn btn-primary" to="/orders">
          Go to orders
        </Link>
      </p>

      {err && <p className="error-msg">{err}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Order</th>
              <th>Product</th>
              <th>Amount</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.paid_at}</td>
                <td>{p.customer_name}</td>
                <td>
                  <Link to={"/orders/" + p.order_id}>#{p.order_id}</Link>
                </td>
                <td>{p.product_type}</td>
                <td>{money(p.amount)}</td>
                <td>{p.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !err && <p className="muted">No payments yet.</p>}
      </div>
    </div>
  );
}
