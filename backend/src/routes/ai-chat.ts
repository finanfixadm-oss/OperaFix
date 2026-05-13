
import express from "express";
import { interpretCRMQuery } from "../modules/ai/openai-interpreter.js";
import { loadCRMFields } from "../modules/ai/crm-schema-loader.js";
import {
  getConversation,
  saveConversation,
} from "../modules/ai/crm-memory.js";

const router = express.Router();

router.post("/message", async (req, res) => {
  try {
    const { message, userId = "default" } = req.body;

    const fields = loadCRMFields();
    const memory = getConversation(userId);

    const parsed = await interpretCRMQuery(
      message,
      fields,
      memory
    );

    saveConversation(userId, {
      lastQuery: parsed,
    });

    return res.json({
      success: true,
      parsed,
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

export default router;
