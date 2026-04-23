import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

const managementsRouter = Router();

function toNullableString(value: unknown) {
  if (!value) return null;
  return String(value);
}

function toNullableNumber(value: unknown) {
  if (!value) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

// LISTAR
managementsRouter.get("/", async (req, res) => {
  const search = String(req.query.search || "");

  const where: Prisma.ManagementWhereInput = search
    ? {
        OR: [
          { razon_social: { contains: search, mode: "insensitive" } },
          { rut: { contains: search, mode: "insensitive" } },
          { numero_solicitud: { contains: search, mode: "insensitive" } },
          { entidad: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const data = await prisma.management.findMany({
    where,
    include: {
      mandante: true,
      company: true,
      line: true,
      lineAfp: true,
    },
    orderBy: { created_at: "desc" },
  });

  res.json(data);
});

// CREAR
managementsRouter.post("/", async (req, res) => {
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
    },
  });

  res.json(item);
});

// ELIMINAR
managementsRouter.delete("/:id", async (req, res) => {
  await prisma.management.delete({
    where: { id: req.params.id },
  });

  res.json({ ok: true });
});

export default managementsRouter;