import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const mandantesRouter = Router();

mandantesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.mandante.findMany({
      include: {
        _count: { select: { groups: true, companies: true } },
        groups: { take: 5, orderBy: { created_at: "desc" } }
      },
      orderBy: { name: "asc" }
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

mandantesRouter.post("/", async (req, res, next) => {
  try {
    const row = await prisma.mandante.create({
      data: {
        name: req.body.name,
        code: req.body.code || null,
        status: req.body.status || "Activo",
        owner_name: req.body.owner_name || null,
        commercial_name: req.body.commercial_name || null,
        email: req.body.email || null,
        phone: req.body.phone || null,
        tag: req.body.tag || null,
        comment: req.body.comment || null
      }
    });
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});
