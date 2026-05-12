import express from "express";
import { PrismaClient } from "@prisma/client";
import { nlToFilters } from "./nl2filters.js";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/nl", async (req, res) => {
  try {
    const { text, action, data } = req.body as {
      text: string;
      action?: "get" | "update";
      data?: Record<string, any>;
    };

    const where = nlToFilters(text);

    if (action === "update") {
      const result = await prisma.lmRecord.updateMany({
        where,
        data: data || {},
      });
      return res.json({ success: true, updated: result.count });
    }

    const rows = await prisma.lmRecord.findMany({
      where,
      take: 100,
    });

    res.json({ success: true, rows, where });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;