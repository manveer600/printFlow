import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { setToken } from "../api.js";

export default function Layout() {
  const navigate = useNavigate();
  const [globalQ, setGlobalQ] = useState("");

  function globalSearch(e) {
    e.preventDefault();
    const q = globalQ.trim();
    navigate(q ? "/orders?q=" + encodeURIComponent(q) : "/orders");
    setGlobalQ("");
  }

  function logout() {
    setToken(null);
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>PrintFlow Manager</h1>
        <form
          onSubmit={globalSearch}
          style={{ display: "flex", gap: "0.35rem", alignItems: "center", flex: "1 1 200px", maxWidth: "320px" }}
        >
          <input
            type="search"
            placeholder="Search orders…"
            value={globalQ}
            onChange={(e) => setGlobalQ(e.target.value)}
            aria-label="Global search"
            style={{ minHeight: 40, fontSize: "0.95rem" }}
          />
          <button type="submit" className="btn btn-secondary" style={{ minHeight: 40, padding: "0.4rem 0.65rem" }}>
            Go
          </button>
        </form>
        <nav>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/" end>
            Dashboard
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/orders">
            Orders
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/customers">
            Customers
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/payments">
            Payments
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/settings">
            Settings
          </NavLink>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: 40, fontSize: "0.9rem" }}
            onClick={logout}
          >
            Logout
          </button>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
