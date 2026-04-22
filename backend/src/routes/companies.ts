import { Router } from "express";
import { prisma } from "../config/prisma.js";

const companiesRouter = Router();

companiesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.company.findMany({
      include: {
        mandante: true,
        group: true,
      },
      orderBy: { razon_social: "asc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

companiesRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.company.create({
      data: {
        razon_social: req.body.razon_social,
        rut: req.body.rut,
        mandante_id: req.body.mandante_id,
        group_id: req.body.group_id || null,
        owner_name: req.body.owner_name || null,
        email: req.body.email || null,
        collaborator_1: req.body.collaborator_1 || null,
        collaborator_2: req.body.collaborator_2 || null,
        active_contract_status: req.body.active_contract_status || null,
      },
      include: {
        mandante: true,
        group: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

export default companiesRouter;