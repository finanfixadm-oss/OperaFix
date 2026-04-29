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

app.get("/", (_req, res) => {
  res.json({ status: "OK DESDE SERVER" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/companies", companiesRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/mandantes", mandantesRouter);
app.use("/api/company-groups", companyGroupsRouter);
app.use("/api/management-lines", managementLinesRouter);
app.use("/api/management-line-afps", managementLineAfpsRouter);
app.use("/api/managements", managementsRouter);
app.use("/api/management-documents", managementDocumentsRouter);
app.use("/api/records", recordsRouter);
app.use("/api/ai", aiActionsRouter);

// Compatibilidad temporal para pantallas antiguas que puedan llamar sin /api.
app.use("/managements", managementsRouter);
app.use("/records", recordsRouter);

export default app;
