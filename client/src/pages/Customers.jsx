import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";

function money(n) {
  const x = Number(n) || 0;
  return "\u20B9" + x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function Customers() {
  const { id } = useParams();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [err, setErr] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  function loadList() {
    const qs = q.trim() ? "?q=" + encodeURIComponent(q.trim()) : "";
    api("/customers" + qs)
      .then(setList)
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetail(null);
    api("/customers/" + id)
      .then((d) => {
        setDetail(d);
        setDetailLoading(false);
      })
      .catch((e) => {
        setErr(e.message);
        setDetail(null);
        setDetailLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (detail && id) {
      setForm({
        name: detail.name || "",
        phone: detail.phone || "",
        address: detail.address || "",
      });
    }
  }, [detail, id]);

  async function saveCustomer(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setErr("");
    try {
      if (detail) {
        await api("/customers/" + detail.id, {
          method: "PUT",
          body: form,
        });
        const d = await api("/customers/" + detail.id);
        setDetail(d);
      } else {
        await api("/customers", { method: "POST", body: form });
        setForm({ name: "", phone: "", address: "" });
        loadList();
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  async function deleteCustomer() {
    if (!detail) return;
    if (!window.confirm("Delete this customer? Only if they have no orders.")) return;
    try {
      await api("/customers/" + detail.id, { method: "DELETE" });
      window.location.href = "/customers";
    } catch (e) {
      setErr(e.message);
    }
  }

  if (id && detailLoading) {
    return (
      <div>
        <p>
          <Link to="/customers">All customers</Link>
        </p>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (id && !detail) {
    return (
      <div>
        <p>
          <Link to="/customers">All customers</Link>
        </p>
        <p className="error-msg">Customer not found.</p>
      </div>
    );
  }

  if (id && detail) {
    return (
      <div>
        <p style={{ marginTop: 0 }}>
          <Link to="/customers">All customers</Link>
        </p>
        <h2>{detail.name}</h2>
        <p className="muted">{detail.phone || "—"}</p>
        {detail.address && <p>{detail.address}</p>}

        <form className="card form-grid" onSubmit={saveCustomer}>
          <h3 style={{ marginTop: 0 }}>Edit</h3>
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label>Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>

        <button type="button" className="btn btn-danger" style={{ marginTop: "0.5rem" }} onClick={deleteCustomer}>
          Delete customer
        </button>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Orders for this customer</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(detail.orders || []).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={"/orders/" + o.id}>#{o.id}</Link>
                    </td>
                    <td>{o.product_type}</td>
                    <td>{money(o.total_selling)}</td>
                    <td>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(detail.orders || []).length === 0 && <p className="muted">No orders yet.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Customers / ग्राहक</h2>

      <form
        className="card toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          loadList();
        }}
      >
        <input type="search" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </form>

      {err && <p className="error-msg">{err}</p>}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add customer</h3>
        <form className="form-grid two" onSubmit={saveCustomer}>
          <div>
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Address (optional)</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">
            Add customer
          </button>
        </form>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>
                  <Link to={"/customers/" + c.id}>View / orders</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="muted">No customers.</p>}
      </div>
    </div>
  );
}
