import express from "express";
import { PrismaClient } from "@prisma/client";
import { nlToFilters } from "./nl2filters.js";
import { nlToAction } from "./nl2action.js";

const prisma = new PrismaClient();
const router = express.Router();

type ExecuteBody = {
  text: string;
  action?: "get" | "update";
  data?: Record<string, unknown>;
  limit?: number;
  dryRun?: boolean;
  recordIds?: string[];
  confirmExecution?: boolean;
};

const toNumber = (value: unknown): number => Number(value || 0);

router.post("/execute", async (req, res) => {
  try {
    const body = req.body as ExecuteBody;

    if (!body?.text?.trim() && !body?.recordIds?.length) {
      return res.status(400).json({
        success: false,
        error: "Debes enviar texto de consulta o IDs específicos.",
      });
    }

    const where = body.recordIds?.length
      ? { id: { in: body.recordIds } }
      : nlToFilters(body.text || "");

    const parsedAction = nlToAction(body.text || "");
    const finalAction: "get" | "update" = body.action || parsedAction.intent;
    const limit = Math.min(Number(body.limit || 100), 500);

    const preview = await prisma.lmRecord.findMany({
      where,
      take: limit,
      orderBy: {
        refund_amount: "desc",
      },
      select: {
        id: true,
        management_id: true,
        mandante: true,
        business_name: true,
        rut: true,
        request_number: true,
        refund_amount: true,
        management_status: true,
        entity: true,
        confirmation_cc: true,
        confirmation_power: true,
        fecha_presentacion_afp: true,
        fecha_ingreso_afp: true,
        fecha_pago_afp: true,
      },
    });

    const totalAmount = preview.reduce((acc, record) => acc + toNumber(record.refund_amount), 0);

    if (finalAction === "get" || body.dryRun || !body.confirmExecution) {
      return res.json({
        success: true,
        mode: finalAction === "update" ? "preview-required" : "get",
        message:
          finalAction === "update"
            ? "Por seguridad no se ejecutan cambios masivos desde lenguaje natural. Revisa el detalle y confirma usando recordIds + confirmExecution=true."
            : "Consulta realizada sobre campos reales del CRM.",
        detectedAction: parsedAction,
        finalAction,
        where,
        previewCount: preview.length,
        totalAmount,
        preview,
      });
    }

    return res.status(400).json({
      success: false,
      error: "La ejecución directa está bloqueada para evitar cambios masivos. Usa acciones específicas por ID desde el detalle del registro.",
      previewCount: preview.length,
      preview,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error ejecutando IA",
    });
  }
});

export default router;
