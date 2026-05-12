import express from "express";
import { executeAI } from "./ai.executor.js";

const router = express.Router();

router.post("/execute", async (req, res) => {
  try {
    const result = await executeAI(req.body);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;