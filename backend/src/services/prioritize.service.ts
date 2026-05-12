import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type PrioritizedLmRecord = {
  id: string;
  score: number;
  refund_amount: number;
  status: string;
  pension_entity: string;
};

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

export const getPrioritizedRecords = async (): Promise<PrioritizedLmRecord[]> => {
  const records = await prisma.lmRecord.findMany({
    take: 5000,
  });

  return records
    .map((r) => {
      const row = r as unknown as Record<string, unknown>;

      const refundAmount = Number(r.refund_amount || 0);

      const status = getValue(
        row,
        [
          "management_status",
          "estado",
          "estadoGestion",
          "estado_gestion",
          "gestion_status",
        ],
        ""
      );

      const pensionEntity = getValue(
        row,
        [
          "entity",
          "afp",
          "entidad",
          "pensionEntity",
          "pension_entity",
          "institution",
        ],
        ""
      );

      const score =
        refundAmount * 0.7 +
        (status.toLowerCase().includes("pendiente") ? 1000 : 0) +
        (pensionEntity.toLowerCase().includes("modelo") ? 500 : 0) +
        (pensionEntity.toLowerCase().includes("capital") ? 500 : 0);

      return {
        id: r.id,
        score,
        refund_amount: refundAmount,
        status,
        pension_entity: pensionEntity,
      };
    })
    .sort((a, b) => b.score - a.score);
};