import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import customersRoutes from "./routes/customers.js";
import ordersRoutes from "./routes/orders.js";
import paymentsRoutes from "./routes/payments.js";
import dashboardRoutes from "./routes/dashboard.js";
import remindersRoutes from "./routes/reminders.js";
import settingsRoutes from "./routes/settings.js";
import exportRoutes from "./routes/export.js";
import backupRoutes from "./routes/backup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "32mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Server is up and running" });
});

app.use("/api/auth", authRoutes);

app.use("/api/customers", authMiddleware, customersRoutes);
app.use("/api/orders", authMiddleware, ordersRoutes);
app.use("/api/payments", authMiddleware, paymentsRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/reminders", authMiddleware, remindersRoutes);
app.use("/api/settings", authMiddleware, settingsRoutes);
app.use("/api/export", authMiddleware, exportRoutes);
app.use("/api/backup", authMiddleware, backupRoutes);

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log("PrintFlow API on http://localhost:" + PORT);
});
