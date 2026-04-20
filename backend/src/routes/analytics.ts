import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const analyticsRouter = Router();

analyticsRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [byEntity, byStatus, byMandante, recentRecords] = await Promise.all([
      prisma.lmRecord.groupBy({
        by: ["entity"],
        _sum: { actual_finanfix_amount: true, refund_amount: true },
        _count: { _all: true },
        where: { entity: { not: null } },
        orderBy: { _count: { entity: "desc" } }
      }),
      prisma.lmRecord.groupBy({
        by: ["management_status"],
        _count: { _all: true },
        _sum: { refund_amount: true },
        where: { management_status: { not: null } },
        orderBy: { _count: { management_status: "desc" } }
      }),
      prisma.lmRecord.groupBy({
        by: ["mandante"],
        _count: { _all: true },
        _sum: { actual_finanfix_amount: true },
        where: { mandante: { not: null } },
        orderBy: { _sum: { actual_finanfix_amount: "desc" } }
      }),
      prisma.lmRecord.findMany({
        take: 8,
        orderBy: { updated_at: "desc" },
        select: {
          id: true,
          rut: true,
          business_name: true,
          entity: true,
          management_status: true,
          updated_at: true,
          actual_finanfix_amount: true
        }
      })
    ]);

    res.json({ byEntity, byStatus, byMandante, recentRecords });
  } catch (error) {
    next(error);
  }
});
