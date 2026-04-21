import { Router } from "express";
import { prisma } from "../config/prisma.js";

export const hierarchyRouter = Router();

hierarchyRouter.get("/overview", async (_req, res, next) => {
  try {
    const mandantes = await prisma.mandante.findMany({
      include: {
        groups: {
          include: {
            companies: { include: { company: true } },
            _count: { select: { companies: true, managementLines: true } }
          },
          orderBy: { name: "asc" }
        },
        companies: { take: 20, orderBy: { business_name: "asc" } },
        _count: { select: { groups: true, companies: true } }
      },
      orderBy: { name: "asc" }
    });
    res.json(mandantes);
  } catch (error) {
    next(error);
  }
});
