import { Router } from "express";
import { prisma } from "../config/prisma.js";

const mandantesRouter = Router();

function nullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

mandantesRouter.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const rows = await prisma.mandante.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { owner_name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: {
            groups: true,
            companies: true,
            managements: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

mandantesRouter.post("/", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Nombre de mandante requerido" });

    const row = await prisma.mandante.upsert({
      where: { name },
      update: {
        owner_name: nullableString(req.body.owner_name),
        email: nullableString(req.body.email),
        phone: nullableString(req.body.phone),
        campaign: nullableString(req.body.campaign),
        active_contract: nullableString(req.body.active_contract),
        last_activity_at: new Date(),
      },
      create: {
        name,
        owner_name: nullableString(req.body.owner_name),
        email: nullableString(req.body.email),
        phone: nullableString(req.body.phone),
        campaign: nullableString(req.body.campaign),
        active_contract: nullableString(req.body.active_contract),
        last_activity_at: new Date(),
      },
      include: {
        _count: {
          select: {
            groups: true,
            companies: true,
            managements: true,
          },
        },
      },
    });

    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

mandantesRouter.put("/:id", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Nombre de mandante requerido" });

    const row = await prisma.mandante.update({
      where: { id: req.params.id },
      data: {
        name,
        owner_name: nullableString(req.body.owner_name),
        email: nullableString(req.body.email),
        phone: nullableString(req.body.phone),
        campaign: nullableString(req.body.campaign),
        active_contract: nullableString(req.body.active_contract),
        last_activity_at: new Date(),
      },
      include: {
        _count: {
          select: {
            groups: true,
            companies: true,
            managements: true,
          },
        },
      },
    });

    res.json(row);
  } catch (error) {
    next(error);
  }
});

export default mandantesRouter;
