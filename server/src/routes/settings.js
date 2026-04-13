import { Router } from "express";
import db from "../db.js";

const router = Router();

const KEYS = ["reminderSound", "reminderBrowserNotify", "languageNote"];

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  for (const k of KEYS) if (out[k] == null) out[k] = "";
  res.json(out);
});

router.put("/", (req, res) => {
  const body = req.body || {};
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  for (const k of KEYS) {
    if (body[k] !== undefined) {
      upsert.run(k, String(body[k]));
    }
  }
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  res.json(out);
});

export default router;
