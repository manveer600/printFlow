import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { signToken, authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const user = db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(String(username).trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Wrong username or password" });
  }
  const token = signToken({ id: user.id, username: user.username });
  res.json({ token, user: { id: user.id, username: user.username } });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

router.post("/change-password", authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ error: "Valid current and new password required (min 4 chars)" });
  }
  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "Current password is wrong" });
  }
  const hash = bcrypt.hashSync(String(newPassword), 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hash,
    req.user.id
  );
  res.json({ ok: true });
});

export default router;
