import { useEffect, useRef, useState } from "react";
import { api, getToken } from "../api.js";

const SEEN_KEY = "printflow_reminder_seen";

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSeen(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-200)));
}

function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    o.type = "square";
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.4);
    setTimeout(() => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 660;
      o2.type = "square";
      g2.gain.setValueAtTime(0.12, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      o2.start(ctx.currentTime);
      o2.stop(ctx.currentTime + 0.4);
    }, 200);
  } catch {
    /* ignore */
  }
}

export default function ReminderAlarm() {
  const [queue, setQueue] = useState([]);
  const settingsRef = useRef({ sound: true, browser: true });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!getToken()) return;

    async function tick() {
      try {
        const s = await api("/settings");
        settingsRef.current = {
          sound: s.reminderSound !== "false",
          browser: s.reminderBrowserNotify !== "false",
        };
        const list = await api("/reminders?upcoming=1");
        const now = Date.now();
        const due = (list || []).filter((r) => {
          if (r.is_done) return false;
          const t = new Date(r.remind_at.replace(" ", "T")).getTime();
          return !Number.isNaN(t) && t <= now;
        });
        if (!due.length) return;
        const seen = loadSeen();
        const fresh = due.filter((r) => !seen.has(r.id));
        if (fresh.length) {
          setQueue((q) => {
            const ids = new Set(q.map((x) => x.id));
            const add = fresh.filter((r) => !ids.has(r.id));
            return [...q, ...add];
          });
        }
      } catch {
        /* offline */
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!queue.length) return;
    const r = queue[0];
    const seen = loadSeen();
    if (!seen.has(r.id)) {
      seen.add(r.id);
      saveSeen(seen);
      if (settingsRef.current.sound) playAlarmSound();
      if (settingsRef.current.browser && "Notification" in window && Notification.permission === "granted") {
        new Notification("PrintFlow — Reminder", { body: r.title });
      }
    }
  }, [queue]);

  async function dismiss() {
    const r = queue[0];
    if (!r) return;
    try {
      await api("/reminders/" + r.id, { method: "PATCH", body: { is_done: true } });
    } catch {
      /* still pop */
    }
    setQueue((q) => q.slice(1));
  }

  async function snooze() {
    const r = queue[0];
    if (!r) return;
    const later = new Date(Date.now() + 15 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const local =
      later.getFullYear() +
      "-" +
      pad(later.getMonth() + 1) +
      "-" +
      pad(later.getDate()) +
      " " +
      pad(later.getHours()) +
      ":" +
      pad(later.getMinutes()) +
      ":00";
    try {
      await api("/reminders/" + r.id, { method: "PATCH", body: { remind_at: local } });
    } catch {
      /* */
    }
    const seen = loadSeen();
    seen.delete(r.id);
    saveSeen(seen);
    setQueue((q) => q.slice(1));
  }

  if (!queue.length) return null;
  const r = queue[0];

  return (
    <div className="alarm-overlay" role="alertdialog" aria-modal="true">
      <div className="alarm-box">
        <h3>Reminder / याद दिलाना</h3>
        <p style={{ marginTop: 0 }}>{r.title}</p>
        {r.customer_name && (
          <p className="muted">
            Customer: {r.customer_name}
            {r.product_type ? " — " + r.product_type : ""}
          </p>
        )}
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {r.remind_at}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={dismiss}>
            Done / हो गया
          </button>
          <button type="button" className="btn btn-secondary" onClick={snooze}>
            Snooze 15 min
          </button>
        </div>
      </div>
    </div>
  );
}
