import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

type Suggestion = {
  id: string;
  refund_amount: number;
  management_status: string;
  entity: string;
  score: number;
  suggestedAction: string;
  suggestedData: Record<string, unknown>;
  reason: string;
};

router.get("/suggestions", async (_req, res) => {
  try {
    const records = await prisma.lmRecord.findMany({
      take: 500,
      orderBy: {
        refund_amount: "desc",
      },
      select: {
        id: true,
        refund_amount: true,
        management_status: true,
        entity: true,
      },
    });

    const suggestions: Suggestion[] = records
      .map((record) => {
        const refundAmount = Number(record.refund_amount || 0);
        const status = String(record.management_status || "");
        const entity = String(record.entity || "");

        let score = refundAmount * 0.7;
        let suggestedAction = "Revisar";
        let suggestedData: Record<string, unknown> = {};
        let reason = "Caso relevante por monto de devolución.";

        if (status.toLowerCase().includes("pendiente") && refundAmount >= 1000000) {
          score += 1000;
          suggestedAction = "Cambiar a En gestión";
          suggestedData = {
            management_status: "En gestión",
            notes: "Sugerido automáticamente por IA: caso pendiente de alto monto.",
          };
          reason = "Pendiente con monto superior a $1.000.000.";
        }

        if (
          status.toLowerCase().includes("pendiente") &&
          (entity.toLowerCase().includes("modelo") ||
            entity.toLowerCase().includes("capital"))
        ) {
          score += 500;
          reason += " AFP prioritaria detectada.";
        }

        return {
          id: record.id,
          refund_amount: refundAmount,
          management_status: status || "Sin estado",
          entity: entity || "Sin entidad",
          score,
          suggestedAction,
          suggestedData,
          reason,
        };
      })
      .filter((item) => item.suggestedAction !== "Revisar")
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    res.json({
      success: true,
      total: suggestions.length,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error generando sugerencias IA",
    });
  }
});

export default router;