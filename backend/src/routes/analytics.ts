import { Router } from "express";
import { prisma } from "../config/prisma.js";

const analyticsRouter = Router();

analyticsRouter.get("/", async (_req, res, next) => {
  try {
    const byEntity = await prisma.lmRecord.groupBy({
      by: ["entity"],
      _sum: {
        monto_finanfix_solutions: true,
        refund_amount: true,
      },
      orderBy: {
        entity: "asc",
      },
    });

    const byStatus = await prisma.lmRecord.groupBy({
      by: ["management_status"],
      _count: {
        id: true,
      },
      orderBy: {
        management_status: "asc",
      },
    });

    const byMandante = await prisma.lmRecord.groupBy({
      by: ["mandante"],
      _sum: {
        monto_finanfix_solutions: true,
      },
      orderBy: {
        mandante: "asc",
      },
    });

    const recentRecords = await prisma.lmRecord.findMany({
      take: 10,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        rut: true,
        business_name: true,
        entity: true,
        management_status: true,
        monto_finanfix_solutions: true,
      },
    });

    res.json({
      byEntity,
      byStatus,
      byMandante,
      recentRecords,
    });
  } catch (error) {
    next(error);
  }
});

export default analyticsRouter;