import { PrismaClient } from "@prisma/client";
import { evaluateRule, Rule } from "../modules/workflow/engine.v2.js";

const prisma = new PrismaClient();

const rules: Rule[] = [
  {
    id: "high_amount_pending",
    trigger: "cron",
    enabled: true,
    conditions: [
      { field: "refund_amount", op: "gt", value: 1000000 },
    ],
    actions: [],
  },
];

export const runCron = async () => {
  const records = await prisma.lmRecord.findMany({
    take: 5000,
  });

  let matched = 0;

  for (const r of records) {
    const row = r as unknown as Record<string, unknown>;

    for (const rule of rules) {
      if (evaluateRule(row, rule)) {
        matched++;
      }
    }
  }

  return {
    success: true,
    total: records.length,
    matched,
  };
};