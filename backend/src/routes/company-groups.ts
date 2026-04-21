import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const companyGroupsRouter = Router();

companyGroupsRouter.get("/", async (req, res, next) => {
  try {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const mandante_id = typeof req.query.mandante_id === "string" ? req.query.mandante_id : undefined;
    const rows = await prisma.companyGroup.findMany({
      where: {
        kind: kind || undefined,
        mandante_id: mandante_id || undefined
      },
      include: {
        mandante: true,
        companies: { include: { company: true } },
        _count: { select: { companies: true, managementLines: true } }
      },
      orderBy: [{ kind: "asc" }, { name: "asc" }]
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

companyGroupsRouter.post("/", async (req, res, next) => {
  try {
    const row = await prisma.companyGroup.create({
      data: {
        mandante_id: req.body.mandante_id,
        name: req.body.name,
        kind: req.body.kind || "LM",
        owner_name: req.body.owner_name || null,
        campaign_name: req.body.campaign_name || null,
        secondary_email: req.body.secondary_email || null,
        power_group: req.body.power_group || null,
        related_groups: req.body.related_groups || null,
        tag: req.body.tag || null,
        comments: req.body.comments || null
      },
      include: { mandante: true }
    });
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

companyGroupsRouter.post("/:id/companies", async (req, res, next) => {
  try {
    const row = await prisma.companyGroupCompany.create({
      data: {
        group_id: req.params.id,
        company_id: req.body.company_id,
        owner_name: req.body.owner_name || null,
        default_entity: req.body.default_entity || null,
        real_finanfix_amount: req.body.real_finanfix_amount || 0
      },
      include: { company: true, group: true }
    });
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});
