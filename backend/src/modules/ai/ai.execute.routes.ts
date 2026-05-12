import express from "express";
import { PrismaClient } from "@prisma/client";
import { nlToFilters } from "./nl2filters.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Campos permitidos para actualización (whitelist)
 * ⚠️ AJUSTA a tu schema real
 */
const ALLOWED_UPDATE_FIELDS = [
  "management_status",
  "estado",
  "afp",
  "entidad",
  "tag_manual",
  "notes",
] as const;

type AllowedField = (typeof ALLOWED_UPDATE_FIELDS)[number];

type ExecuteBody = {
  text: string;                 // lenguaje natural
  action: "get" | "update";     // consulta o ejecución
  data?: Record<string, any>;   // campos a actualizar
  limit?: number;               // límite de impacto
  dryRun?: boolean;             // solo simula
};

function sanitizeData(data: Record<string, any> | undefined) {
  const clean: Record<string, any> = {};
  if (!data) return clean;

  for (const [k, v] of Object.entries(data)) {
    if ((ALLOWED_UPDATE_FIELDS as readonly string[]).includes(k)) {
      clean[k as AllowedField] = v;
    }
  }
  return clean;
}

router.post("/execute", async (req, res) => {
  try {
    const body = req.body as ExecuteBody;

    if (!body?.text) {
      return res.status(400).json({ success: false, error: "Falta 'text'" });
    }

    const where = nlToFilters(body.text);
    const limit = Math.min(Number(body.limit || 100), 500); // tope duro
    const data = sanitizeData(body.data);

    // 🔎 PREVIEW
    const preview = await prisma.lmRecord.findMany({
      where,
      take: limit,
      select: {
        id: true,
        refund_amount: true,
      },
    });

    if (body.action === "get" || body.dryRun) {
      return res.json({
        success: true,
        mode: body.dryRun ? "dry-run" : "get",
        where,
        previewCount: preview.length,
        preview,
      });
    }

    // 🔒 VALIDACIONES
    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        error: "No hay campos válidos para actualizar",
      });
    }

    if (preview.length === 0) {
      return res.json({
        success: true,
        updated: 0,
        message: "Sin registros que cumplan filtros",
      });
    }

    // 🚀 EJECUCIÓN
    const result = await prisma.lmRecord.updateMany({
      where: {
        id: { in: preview.map((r) => r.id) },
      },
      data,
    });

    return res.json({
      success: true,
      updated: result.count,
      appliedData: data,
    });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

export default router;