import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const getValue = (
  record: Record<string, unknown>,
  fields: string[],
  fallback: string
): string => {
  for (const field of fields) {
    const value = record[field];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
};

router.get("/metrics", async (_req, res) => {
  try {
    const records = await prisma.lmRecord.findMany({
      take: 5000,
    });

    const total = records.reduce((acc, r) => {
      return acc + Number(r.refund_amount || 0);
    }, 0);

    const byStatus: Record<string, number> = {};
    const byEntity: Record<string, number> = {};

    for (const r of records) {
      const row = r as unknown as Record<string, unknown>;

      const status = getValue(
        row,
        [
          "management_status",
          "estado",
          "estadoGestion",
          "estado_gestion",
          "gestion_status",
        ],
        "Sin estado"
      );

      const entity = getValue(
        row,
        [
          "entity",
          "afp",
          "entidad",
          "pensionEntity",
          "pension_entity",
          "institution",
        ],
        "Sin entidad"
      );

      const amount = Number(r.refund_amount || 0);

      byStatus[status] = (byStatus[status] || 0) + amount;
      byEntity[entity] = (byEntity[entity] || 0) + amount;
    }

    res.json({
      total,
      byEstado: Object.entries(byStatus).map(([estado, monto]) => ({
        estado,
        monto,
      })),
      byEntidad: Object.entries(byEntity).map(([entidad, monto]) => ({
        entidad,
        monto,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: "Error generando métricas del dashboard",
    });
  }
});

export default router;