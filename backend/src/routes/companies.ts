import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { filterRowsBySession, ensureMandanteAccess, parseSession, rowMandanteAllowed } from "../middleware/security.js";

const companiesRouter = Router();

companiesRouter.get("/", async (req, res, next) => {
  try {
    const items = await prisma.company.findMany({
      include: {
        mandante: true,
        group: true,
      },
      orderBy: { razon_social: "asc" },
    });

    res.json(filterRowsBySession(items as any[], req as any));
  } catch (error) {
    next(error);
  }
});

companiesRouter.post("/", async (req, res, next) => {
  try {
    const session = parseSession(req);
    if (session && String(session.role || "").toLowerCase() !== "admin" && !rowMandanteAllowed({ mandante_id: req.body.mandante_id }, session)) {
      return res.status(403).json({ message: "No puedes crear información para mandantes no asignados." });
    }

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