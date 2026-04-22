import express from "express";
import cors from "cors";
import path from "node:path";
import companiesRouter from "./routes/companies.js";
import documentsRouter from "./routes/documents.js";
import analyticsRouter from "./routes/analytics.js";
import mandantesRouter from "./routes/mandantes.js";
import companyGroupsRouter from "./routes/company-groups.js";

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

app.use(express.json());
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

export default app;