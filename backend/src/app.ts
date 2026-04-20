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
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://crm.finanfix.cl",
  "https://vigilant-wholeness-production.up.railway.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/storage", express.static(path.resolve(process.cwd(), "storage")));

app.get("/", (_req, res) => {
  res.json({ name: "OperaFix API", status: "ok" });
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

app.use(errorHandler);