import express from "express";
import cors from "cors";
import path from "node:path";

import companiesRouter from "./routes/companies.js";
import documentsRouter from "./routes/documents.js";
import analyticsRouter from "./routes/analytics.js";
import mandantesRouter from "./routes/mandantes.js";
import companyGroupsRouter from "./routes/company-groups.js";
import managementLinesRouter from "./routes/management-lines.js";
import managementLineAfpsRouter from "./routes/management-line-afps.js";
import managementsRouter from "./routes/managements.js";
import managementDocumentsRouter from "./routes/management-documents.js";
import recordsRouter from "./routes/records.js";
import aiActionsRouter from "./routes/ai-actions.js";
import importRecordsRouter from "./routes/import-records.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import portalRouter from "./routes/portal.js";
import reportBuilderRouter from "./routes/report-builder.js";
import auditRouter from "./routes/audit.js";
import { requireAuth, requireRoles } from "./middleware/security.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import dashboardRoutes from "./routes/dashboard.js";


const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://crm.finanfix.cl",
      "https://operafix-production.up.railway.app",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/storage", express.static(path.resolve(process.cwd(), "storage")));
app.use("/api/ai", aiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.get("/", (_req, res) => {
  res.json({ status: "OK DESDE SERVER" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Público: login y sesión.
app.use("/api/auth", authRouter);

// Seguridad por módulos.
app.use("/api/portal", requireAuth, portalRouter);
app.use("/api/report-builder", requireAuth, reportBuilderRouter);

app.use("/api/analytics", requireAuth, requireRoles(["admin", "interno", "kam"]), analyticsRouter);
app.use("/api/companies", requireAuth, requireRoles(["admin", "interno", "kam"]), companiesRouter);
app.use("/api/documents", requireAuth, requireRoles(["admin", "interno", "kam"]), documentsRouter);
app.use("/api/mandantes", requireAuth, requireRoles(["admin", "interno"]), mandantesRouter);
app.use("/api/company-groups", requireAuth, requireRoles(["admin", "interno", "kam"]), companyGroupsRouter);
app.use("/api/management-lines", requireAuth, requireRoles(["admin", "interno", "kam"]), managementLinesRouter);
app.use("/api/management-line-afps", requireAuth, requireRoles(["admin", "interno", "kam"]), managementLineAfpsRouter);
app.use("/api/managements", requireAuth, requireRoles(["admin", "interno", "kam"]), managementsRouter);
app.use("/api/management-documents", requireAuth, requireRoles(["admin", "interno", "kam"]), managementDocumentsRouter);
app.use("/api/records", requireAuth, requireRoles(["admin", "interno", "kam"]), recordsRouter);
app.use("/api/ai", requireAuth, requireRoles(["admin", "interno", "kam"]), aiActionsRouter);
app.use("/api/imports", requireAuth, requireRoles(["admin", "interno"]), importRecordsRouter);
app.use("/api/users", requireAuth, requireRoles(["admin", "interno"]), usersRouter);
app.use("/api/audit", requireAuth, requireRoles(["admin", "interno"]), auditRouter);

// Compatibilidad temporal para pantallas antiguas que puedan llamar sin /api.
app.use("/managements", requireAuth, requireRoles(["admin", "interno", "kam"]), managementsRouter);
app.use("/records", requireAuth, requireRoles(["admin", "interno", "kam"]), recordsRouter);

export default app;
