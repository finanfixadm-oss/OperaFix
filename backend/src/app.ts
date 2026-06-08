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
import kamRouter from "./routes/kam.js";
import portalRouter from "./routes/portal.js";
import reportBuilderRouter from "./routes/report-builder.js";
import auditRouter from "./routes/audit.js";
import aiChatRoutes from "./routes/ai-chat.js";

import dashboardRoutes from "./routes/dashboard.js";
import intelligenceRouter from "./routes/intelligence.js";
import automationRoutes from "./routes/automation.js";
import aiExecuteRoutes from "./modules/ai/ai.execute.routes.js";
import aiSuggestionsRoutes from "./modules/ai/ai.suggestions.routes.js";

import { requireAuth, requireRoles } from "./middleware/security.js";

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

// Rutas públicas / operativas V66
app.use("/api/automation", automationRoutes);
app.use("/api/ai-actions", aiExecuteRoutes);
app.use("/api/ai-suggestions", aiSuggestionsRoutes);
app.use("/api/dashboard", requireAuth, requireRoles(["admin", "interno", "kam_admin", "kam"]), dashboardRoutes);
app.use("/api/intelligence", requireAuth, requireRoles(["admin", "interno", "kam_admin", "kam"]), intelligenceRouter);
app.use("/api/ai-chat", aiChatRoutes);
app.get("/", (_req, res) => {
  res.json({ status: "OK DESDE SERVER" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Público: login y sesión
app.use("/api/auth", authRouter);

// Seguridad por módulos
app.use("/api/portal", requireAuth, portalRouter);
app.use("/api/report-builder", requireAuth, reportBuilderRouter);

app.use(
  "/api/analytics",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  analyticsRouter
);

app.use(
  "/api/companies",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  companiesRouter
);

app.use(
  "/api/documents",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  documentsRouter
);

app.use(
  "/api/mandantes",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  mandantesRouter
);

app.use(
  "/api/company-groups",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  companyGroupsRouter
);

app.use(
  "/api/management-lines",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  managementLinesRouter
);

app.use(
  "/api/management-line-afps",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  managementLineAfpsRouter
);

app.use(
  "/api/managements",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  managementsRouter
);

app.use(
  "/api/management-documents",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  managementDocumentsRouter
);

app.use(
  "/api/records",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  recordsRouter
);

// IA existente protegida del sistema
app.use(
  "/api/ai",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  aiActionsRouter
);

app.use(
  "/api/imports",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  importRecordsRouter
);


app.use(
  "/api/kam",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  kamRouter
);

app.use(
  "/api/users",
  requireAuth,
  requireRoles(["admin", "kam_admin"]),
  usersRouter
);

app.use(
  "/api/audit",
  requireAuth,
  requireRoles(["admin", "interno"]),
  auditRouter
);

// Compatibilidad temporal para pantallas antiguas que puedan llamar sin /api
app.use(
  "/managements",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  managementsRouter
);

app.use(
  "/records",
  requireAuth,
  requireRoles(["admin", "interno", "kam_admin", "kam"]),
  recordsRouter
);

export default app;
