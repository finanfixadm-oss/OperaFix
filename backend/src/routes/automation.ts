import express from "express";
import { getPrioritizedRecords } from "../services/prioritize.service.js";
import { runCron } from "../jobs/cron.js";

const router = express.Router();

router.get("/priorities", async (_req, res) => {
  try {
    const records = await getPrioritizedRecords();

    res.json({
      success: true,
      total: records.length,
      records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error obteniendo prioridades",
    });
  }
});

router.post("/run-cron", async (_req, res) => {
  try {
    await runCron();

    res.json({
      success: true,
      message: "Automatización ejecutada correctamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error ejecutando automatización",
    });
  }
});

export default router;