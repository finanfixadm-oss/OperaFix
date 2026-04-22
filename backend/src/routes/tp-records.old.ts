import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const tpRecordsRouter = Router();

tpRecordsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.tpRecord.findMany({
      orderBy: { created_at: "desc" }
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

tpRecordsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.tpRecord.create({
      data: {
        tp_group_id: req.body.tp_group_id,
        mandante: req.body.mandante,
        portal_access: req.body.portal_access,
        production_months: req.body.production_months,
        comment: req.body.comment,
        client_contract_status: req.body.client_contract_status,
        cen_content: req.body.cen_content,
        cen_query: req.body.cen_query
      }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});
