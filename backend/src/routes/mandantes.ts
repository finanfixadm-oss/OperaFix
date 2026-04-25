import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

const managementsRouter = Router();

function toNullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// LISTAR
managementsRouter.get("/", async (req, res, next) => {
  try {
    const lineAfpId =
      typeof req.query.line_afp_id === "string" ? req.query.line_afp_id : undefined;

    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: Prisma.ManagementWhereInput = {
      line_afp_id: lineAfpId,
      OR: search
        ? [
            {
              razon_social: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              rut: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              numero_solicitud: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              entidad: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              estado_gestion: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ]
        : undefined,
    };

    const items = await prisma.management.findMany({
      where,
      include: {
        mandante: true,
        company: true,
        line: true,
        lineAfp: true,
      },
      orderBy: { created_at: "desc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

// CREAR
managementsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.management.create({
      data: {
        mandante_id: req.body.mandante_id,
        company_id: req.body.company_id,
        line_id: req.body.line_id,
        line_afp_id: req.body.line_afp_id,
        management_type: req.body.management_type === "TP" ? "TP" : "LM",

        razon_social: toNullableString(req.body.razon_social),
        rut: toNullableString(req.body.rut),
        entidad: toNullableString(req.body.entidad),
        estado_gestion: toNullableString(req.body.estado_gestion),
        numero_solicitud: toNullableString(req.body.numero_solicitud),

        monto_devolucion: toNullableNumber(req.body.monto_devolucion),
        monto_pagado: toNullableNumber(req.body.monto_pagado),

        banco: toNullableString(req.body.banco),
        numero_cuenta: toNullableString(req.body.numero_cuenta),
        tipo_cuenta: toNullableString(req.body.tipo_cuenta),

        confirmacion_cc: req.body.confirmacion_cc === true,
        confirmacion_poder: req.body.confirmacion_poder === true,

        comment: toNullableString(req.body.comment),

        created_at: new Date(),
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// ELIMINAR
managementsRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.management.delete({
      where: { id: req.params.id },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default managementsRouter;