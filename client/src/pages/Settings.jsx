import { useEffect, useState } from "react";
import { api, downloadBlob } from "../api.js";

export default function Settings() {
  const [settings, setSettings] = useState({
    reminderSound: "true",
    reminderBrowserNotify: "true",
    languageNote: "hi-en",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [reportDay, setReportDay] = useState(new Date().toISOString().slice(0, 10));
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [remTitle, setRemTitle] = useState("");
  const [remAt, setRemAt] = useState("");
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    api("/settings")
      .then(setSettings)
      .catch(() => {});
  }, []);

  function loadReminders() {
    api("/reminders")
      .then(setReminders)
      .catch(() => {});
  }

  useEffect(() => {
    loadReminders();
  }, []);

  async function saveSettings(next) {
    setErr("");
    setMsg("");
    try {
      const s = await api("/settings", { method: "PUT", body: next });
      setSettings(s);
      setMsg("Saved.");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setMsg("Password updated.");
    } catch (e) {
      setErr(e.message);
    }
  }

  async function loadDaily(e) {
    e.preventDefault();
    setErr("");
    try {
      const d = await api("/dashboard/reports/daily?date=" + encodeURIComponent(reportDay));
      setDaily(d);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function loadMonthly(e) {
    e.preventDefault();
    setErr("");
    try {
      const d = await api("/dashboard/reports/monthly?month=" + encodeURIComponent(reportMonth));
      setMonthly(d);
    } catch (e) {
      setErr(e.message);
    }
  }

  function notifyPermission() {
    if (!("Notification" in window)) {
      setErr("Browser notifications not supported.");
      return;
    }
    Notification.requestPermission().then((p) => {
      setMsg("Notification permission: " + p);
    });
  }

  async function addReminder(e) {
    e.preventDefault();
    if (!remTitle.trim() || !remAt) return;
    setErr("");
    try {
      await api("/reminders", {
        method: "POST",
        body: { title: remTitle.trim(), remind_at: remAt.replace("T", " ") },
      });
      setRemTitle("");
      setRemAt("");
      setMsg("Reminder saved.");
      loadReminders();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function toggleReminderDone(r) {
    try {
      await api("/reminders/" + r.id, {
        method: "PATCH",
        body: { is_done: !r.is_done },
      });
      loadReminders();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function deleteReminder(id) {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await api("/reminders/" + id, { method: "DELETE" });
      loadReminders();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function restoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      setErr("Invalid JSON file.");
      return;
    }
    if (!window.confirm("This will REPLACE all data. Continue?")) return;
    setErr("");
    try {
      await api("/backup/import.json", { method: "POST", body: data });
      setMsg("Restored. Reloading…");
      window.location.reload();
    } catch (err2) {
      setErr(err2.message);
    }
    e.target.value = "";
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Settings / सेटिंग</h2>

      {msg && <p className="muted">{msg}</p>}
      {err && <p className="error-msg">{err}</p>}

      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>Reminders / याद</h3>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={settings.reminderSound !== "false"}
            onChange={(e) =>
              saveSettings({ ...settings, reminderSound: e.target.checked ? "true" : "false" })
            }
          />
          Alarm sound when reminder is due
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={settings.reminderBrowserNotify !== "false"}
            onChange={(e) =>
              saveSettings({
                ...settings,
                reminderBrowserNotify: e.target.checked ? "true" : "false",
              })
            }
          />
          Browser notification (if allowed)
        </label>
        <button type="button" className="btn btn-secondary" onClick={notifyPermission}>
          Allow browser notifications
        </button>
        <p className="muted">Custom reminders: add below or from an order page.</p>
        <form className="form-grid" onSubmit={addReminder}>
          <div>
            <label>Reminder text</label>
            <input value={remTitle} onChange={(e) => setRemTitle(e.target.value)} placeholder="e.g. Call customer" />
          </div>
          <div>
            <label>Date & time</label>
            <input type="datetime-local" value={remAt} onChange={(e) => setRemAt(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Save reminder
          </button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Title</th>
                <th>Order</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((r) => (
                <tr key={r.id} style={{ opacity: r.is_done ? 0.55 : 1 }}>
                  <td>{r.remind_at}</td>
                  <td>{r.title}</td>
                  <td>{r.order_id ? "#" + r.order_id : "—"}</td>
                  <td>
                    <button type="button" className="btn btn-secondary" onClick={() => toggleReminderDone(r)}>
                      {r.is_done ? "Undo" : "Done"}
                    </button>{" "}
                    <button type="button" className="btn btn-secondary" onClick={() => deleteReminder(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <form className="form-grid" onSubmit={changePassword}>
          <div>
            <label>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label>New password (min 4 characters)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Update password
          </button>
        </form>
      </div>

      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>Export</h3>
        <p className="muted">Download orders as Excel or PDF.</p>
        <div className="toolbar">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => downloadBlob("/export/orders.xlsx", "printflow-orders.xlsx")}
          >
            Download Excel
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => downloadBlob("/export/orders.pdf", "printflow-orders.pdf")}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>Backup & restore</h3>
        <p className="muted">Download full backup JSON. Restore replaces all data — use carefully.</p>
        <div className="toolbar">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => downloadBlob("/backup/export.json", "printflow-backup.json")}
          >
            Download backup
          </button>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            Restore from file
            <input type="file" accept="application/json,.json" hidden onChange={restoreFile} />
          </label>
        </div>
      </div>

      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>Daily report</h3>
        <form className="toolbar" onSubmit={loadDaily}>
          <input type="date" value={reportDay} onChange={(e) => setReportDay(e.target.value)} />
          <button type="submit" className="btn btn-secondary">
            Load
          </button>
        </form>
        {daily && (
          <div className="muted">
            <p>
              Orders: {daily.orders?.length || 0} · Collections:{" "}
              <strong>{daily.day_collections}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="card form-grid">
        <h3 style={{ marginTop: 0 }}>Monthly report</h3>
        <form className="toolbar" onSubmit={loadMonthly}>
          <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
          <button type="submit" className="btn btn-secondary">
            Load
          </button>
        </form>
        {monthly && (
          <div className="muted">
            <p>
              Orders: {monthly.order_count} · Collections: <strong>{monthly.month_collections}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
