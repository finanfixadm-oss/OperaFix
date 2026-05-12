import { PrismaClient } from "@prisma/client";
import { evaluateRule, Rule } from "../modules/workflow/engine.v2.js";

const prisma = new PrismaClient();

// ejemplo de reglas (puedes persistirlas en DB luego)
const rules: Rule[] = [
  {
    id: "high_amount_pending",
    trigger: "cron",
    enabled: true,
    conditions: [
      { field: "refund_amount", op: "gt", value: 1000000 },
      { field: "management_status", op: "contains", value: "pendiente" },
    ],
    actions: [
      { type: "update", data: { tag_auto: "HIGH_VALUE" } },
    ],
  },
];

export const runCron = async () => {
  const records = await prisma.lmRecord.findMany({ take: 5000 });

  for (const r of records) {
    const row = r as unknown as Record<string, any>;

    for (const rule of rules) {
      if (evaluateRule(row, rule)) {
        for (const a of rule.actions) {
          if (a.type === "update") {
            await prisma.lmRecord.update({
              where: { id: r.id },
              data: a.data as any,
            });
          }
        }
      }
    }
  }
};