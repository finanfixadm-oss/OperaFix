import { Router } from "express";
import { prisma } from "../config/prisma.js";

const mandantesRouter = Router();

mandantesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.mandante.findMany({
      orderBy: { name: "asc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

mandantesRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.mandante.create({
      data: {
        name: req.body.name,
        owner_name: req.body.owner_name || null,
        email: req.body.email || null,
        phone: req.body.phone || null,
        campaign: req.body.campaign || null,
        active_contract: req.body.active_contract || null,
        end_contract_date: req.body.end_contract_date
          ? new Date(req.body.end_contract_date)
          : null,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

export default mandantesRouter;