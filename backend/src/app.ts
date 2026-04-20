import express from "express";
import cors from "cors";
import path from "node:path";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { companiesRouter } from "./routes/companies.js";
import { collaboratorsRouter } from "./routes/collaborators.js";
import { lmGroupsRouter } from "./routes/lm-groups.js";
import { lmRecordsRouter } from "./routes/lm-records.js";
import { tpGroupsRouter } from "./routes/tp-groups.js";
import { tpRecordsRouter } from "./routes/tp-records.js";
import { documentsRouter } from "./routes/documents.js";
import { reportsRouter } from "./routes/reports.js";
import { analyticsRouter } from "./routes/analytics.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin }));
app.use(express.json());
app.use("/storage", express.static(path.resolve(env.uploadDir)));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "OperaFix API" });
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/collaborators", collaboratorsRouter);
app.use("/api/lm-groups", lmGroupsRouter);
app.use("/api/lm-records", lmRecordsRouter);
app.use("/api/tp-groups", tpGroupsRouter);
app.use("/api/tp-records", tpRecordsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/analytics", analyticsRouter);

app.use(errorHandler);
