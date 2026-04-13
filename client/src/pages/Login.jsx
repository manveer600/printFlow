import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { api, setToken, getToken } from "../api.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (getToken()) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      setToken(data.token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>PrintFlow Manager</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Sign in / लॉग इन
        </p>
        <form onSubmit={submit} className="form-grid">
          {error && <p className="error-msg">{error}</p>}
          <div>
            <label htmlFor="u">Username</label>
            <input
              id="u"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="p">Password</label>
            <input
              id="p"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Enter
          </button>
        </form>
        <p className="muted" style={{ marginBottom: 0, fontSize: "0.85rem", marginTop: "1rem" }}>
          Default: admin / admin123 — change password in Settings.
        </p>
      </div>
    </div>
  );
}
