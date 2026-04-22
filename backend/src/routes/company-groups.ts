import { Router } from "express";
import { prisma } from "../config/prisma.js";

const companyGroupsRouter = Router();

companyGroupsRouter.get("/", async (req, res, next) => {
  try {
    const groupType =
      typeof req.query.group_type === "string" ? req.query.group_type : undefined;

    const items = await prisma.companyGroup.findMany({
      where: {
        group_type: groupType === "LM" || groupType === "TP" ? groupType : undefined,
      },
      include: {
        mandante: true,
        companies: true,
      },
      orderBy: [{ group_type: "asc" }, { name: "asc" }],
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

companyGroupsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.companyGroup.create({
      data: {
        name: req.body.name,
        mandante_id: req.body.mandante_id,
        group_type: req.body.group_type === "TP" ? "TP" : "LM",
        owner_name: req.body.owner_name || null,
        secondary_email: req.body.secondary_email || null,
        campaign: req.body.campaign || null,
        power_group_company: req.body.power_group_company || null,
        associated_groups: req.body.associated_groups || null,
        no_email_participation:
          typeof req.body.no_email_participation === "boolean"
            ? req.body.no_email_participation
            : false,
        tag: req.body.tag || null,
      },
      include: {
        mandante: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

export default companyGroupsRouter;