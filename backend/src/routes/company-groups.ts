import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { filterRowsBySession, ensureMandanteAccess, parseSession, rowMandanteAllowed } from "../middleware/security.js";

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

    res.json(filterRowsBySession(items as any[], req as any));
  } catch (error) {
    next(error);
  }
});

companyGroupsRouter.post("/", async (req, res, next) => {
  try {
    const session = parseSession(req);
    if (session && String(session.role || "").toLowerCase() !== "admin" && !rowMandanteAllowed({ mandante_id: req.body.mandante_id }, session)) {
      return res.status(403).json({ message: "No puedes crear información para mandantes no asignados." });
    }

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