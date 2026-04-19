import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const lmRecordsRouter = Router();

lmRecordsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.lmRecord.findMany({
      orderBy: { created_at: "desc" },
      take: 200
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.lmRecord.create({
      data: {
        lm_group_id: req.body.lm_group_id,
        rut: req.body.rut,
        entity: req.body.entity,
        management_status: req.body.management_status,
        refund_amount: req.body.refund_amount,
        confirmation_cc: req.body.confirmation_cc,
        confirmation_power: req.body.confirmation_power,
        actual_paid_amount: req.body.actual_paid_amount,
        excess_type_reason: req.body.excess_type_reason,
        worker_status: req.body.worker_status,
        request_number: req.body.request_number,
        business_name: req.body.business_name,
        bank_name: req.body.bank_name,
        account_number: req.body.account_number,
        account_type: req.body.account_type,
        comment: req.body.comment,
        mandante: req.body.mandante,
        portal_access: req.body.portal_access
      }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});
