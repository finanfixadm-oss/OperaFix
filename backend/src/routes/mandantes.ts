import { Router } from "express";
import { prisma } from "../config/prisma.js";

const mandantesRouter = Router();

function toNullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

mandantesRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.mandante.findMany({
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
        owner_name: toNullableString(req.body.owner_name),
        email: toNullableString(req.body.email),
        phone: toNullableString(req.body.phone),
      },
      create: {
        name,
        owner_name: toNullableString(req.body.owner_name),
        email: toNullableString(req.body.email),
        phone: toNullableString(req.body.phone),
      },
    });

    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

export default mandantesRouter;
