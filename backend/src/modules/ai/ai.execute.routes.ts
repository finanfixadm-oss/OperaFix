import express from "express";
import { PrismaClient } from "@prisma/client";
import { nlToFilters } from "./nl2filters.js";
import { nlToAction } from "./nl2action.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Campos permitidos para actualización.
 * IMPORTANTE: deben existir en tu modelo LmRecord.
 */
const ALLOWED_UPDATE_FIELDS = [
  "management_status",
  "tag_manual",
  "notes",
] as const;

type AllowedField = (typeof ALLOWED_UPDATE_FIELDS)[number];

type ExecuteBody = {
  text: string;
  action?: "get" | "update";
  data?: Record<string, unknown>;
  limit?: number;
  dryRun?: boolean;
};

function sanitizeData(data: Record<string, unknown> | undefined) {
  const clean: Record<string, unknown> = {};

  if (!data) {
    return clean;
  }

  for (const [key, value] of Object.entries(data)) {
    if ((ALLOWED_UPDATE_FIELDS as readonly string[]).includes(key)) {
      clean[key as AllowedField] = value;
    }
  }

  return clean;
}

router.post("/execute", async (req, res) => {
  try {
    const body = req.body as ExecuteBody;

    if (!body?.text || !body.text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Falta 'text'",
      });
    }

    const where = nlToFilters(body.text);
    const parsedAction = nlToAction(body.text);

    const finalAction: "get" | "update" = body.action || parsedAction.intent;

    const rawData =
      body.data && Object.keys(body.data).length > 0
        ? body.data
        : parsedAction.data;

    const data = sanitizeData(rawData);

    const limit = Math.min(Number(body.limit || 100), 500);

    const preview = await prisma.lmRecord.findMany({
      where,
      take: limit,
      select: {
        id: true,
        refund_amount: true,
        management_status: true,
        entity: true,
      },
    });

    if (finalAction === "get" || body.dryRun) {
      return res.json({
        success: true,
        mode: body.dryRun ? "dry-run" : "get",
        detectedAction: parsedAction,
        finalAction,
        where,
        data,
        previewCount: preview.length,
        preview,
      });
    }

    if (finalAction === "update" && Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No hay campos válidos para actualizar",
        detectedAction: parsedAction,
        allowedFields: ALLOWED_UPDATE_FIELDS,
      });
    }

    if (preview.length === 0) {
      return res.json({
        success: true,
        updated: 0,
        message: "Sin registros que cumplan filtros",
        where,
      });
    }

    const result = await prisma.lmRecord.updateMany({
      where: {
        id: {
          in: preview.map((record) => record.id),
        },
      },
      data,
    });

    return res.json({
      success: true,
      updated: result.count,
      appliedData: data,
      where,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error ejecutando IA",
    });
  }
});

export default router;