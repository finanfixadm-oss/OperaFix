import { Router } from "express";
import { prisma } from "../config/prisma.js";

const mandantesRouter = Router();

function nullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function nullableDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mandanteData(body: any) {
  return {
    name: String(body.name || body.nombre || "").trim(),
    owner_name: nullableString(body.owner_name),
    email: nullableString(body.email),
    phone: nullableString(body.phone),
    campaign: nullableString(body.campaign),
    active_contract: nullableString(body.active_contract),
    end_contract_date: nullableDate(body.end_contract_date),
    last_activity_at: new Date(),
  };
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
              { phone: { contains: search, mode: "insensitive" } },
              { campaign: { contains: search, mode: "insensitive" } },
              { active_contract: { contains: search, mode: "insensitive" } },
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
    const data = mandanteData(req.body);

    if (!data.name) {
      return res.status(400).json({ message: "Nombre de mandante requerido" });
    }

    const row = await prisma.mandante.create({
      data,
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
    const data = mandanteData(req.body);

    if (!data.name) {
      return res.status(400).json({ message: "Nombre de mandante requerido" });
    }

    const row = await prisma.mandante.update({
      where: { id: req.params.id },
      data,
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

mandantesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.mandante.delete({
      where: { id: req.params.id },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default mandantesRouter;
