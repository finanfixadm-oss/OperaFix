import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const reportsRouter = Router();

reportsRouter.get("/overview", async (_req, res, next) => {
  try {
    const [totalRecords, paidRecords, pendingPower, pendingCC, totalRefundAgg, totalFinanfixAgg] = await Promise.all([
      prisma.lmRecord.count(),
      prisma.lmRecord.count({ where: { management_status: "Pagado" } }),
      prisma.lmRecord.count({ where: { confirmation_power: false } }),
      prisma.lmRecord.count({ where: { confirmation_cc: false } }),
      prisma.lmRecord.aggregate({ _sum: { refund_amount: true } }),
      prisma.lmRecord.aggregate({ _sum: { actual_finanfix_amount: true } })
    ]);

    res.json({
      totalRecords,
      paidRecords,
      pendingPower,
      pendingCC,
      totalRefund: Number(totalRefundAgg._sum.refund_amount || 0),
      totalFinanfix: Number(totalFinanfixAgg._sum.actual_finanfix_amount || 0)
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/lm-records", async (_req, res, next) => {
  try {
    const rows = await prisma.lmRecord.findMany({
      select: {
        id: true,
        rut: true,
        business_name: true,
        entity: true,
        management_status: true,
        refund_amount: true,
        confirmation_cc: true,
        confirmation_power: true,
        actual_finanfix_amount: true,
        client_contract_status: true,
        created_at: true
      },
      take: 500,
      orderBy: { updated_at: "desc" }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});
