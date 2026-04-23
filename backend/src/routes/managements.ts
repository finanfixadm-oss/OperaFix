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

function toBoolean(value: unknown) {
  return (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === "Sí" ||
    value === "Si"
  );
}

// =======================
// GET LISTADO
// =======================
managementsRouter.get("/", async (req, res, next) => {
  try {
    const lineAfpId =
      typeof req.query.line_afp_id === "string"
        ? req.query.line_afp_id
        : undefined;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

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
        documents: true,
      },
      orderBy: { created_at: "desc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

// =======================
// GET DETALLE
// =======================
managementsRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.management.findUnique({
      where: { id: req.params.id },
      include: {
        mandante: true,
        company: true,
        line: true,
        lineAfp: true,
        documents: true,
        notes: true,
        activities: true,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Gestión no encontrada" });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// =======================
// CREATE
// =======================
managementsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.management.create({
      data: {
        mandante_id: req.body.mandante_id,
        group_id: req.body.group_id || null,
        company_id: req.body.company_id,
        line_id: req.body.line_id,
        line_afp_id: req.body.line_afp_id || null,
        management_type: req.body.management_type === "TP" ? "TP" : "LM",

        owner_name: toNullableString(req.body.owner_name),
        razon_social: toNullableString(req.body.razon_social),
        rut: toNullableString(req.body.rut),
        entidad: toNullableString(req.body.entidad),
        estado_gestion: toNullableString(req.body.estado_gestion),
        numero_solicitud: toNullableString(req.body.numero_solicitud),

        envio_afp: toNullableString(req.body.envio_afp),
        estado_contrato_cliente: toNullableString(
          req.body.estado_contrato_cliente
        ),
        estado_trabajador: toNullableString(req.body.estado_trabajador),
        motivo_tipo_exceso: toNullableString(req.body.motivo_tipo_exceso),
        motivo_rechazo: toNullableString(req.body.motivo_rechazo),
        mes_produccion_2026: toNullableString(
          req.body.mes_produccion_2026
        ),
        grupo_empresa: toNullableString(req.body.grupo_empresa),
        acceso_portal: toNullableString(req.body.acceso_portal),

        banco: toNullableString(req.body.banco),
        tipo_cuenta: toNullableString(req.body.tipo_cuenta),
        numero_cuenta: toNullableString(req.body.numero_cuenta),

        confirmacion_cc: toBoolean(req.body.confirmacion_cc),
        confirmacion_poder: toBoolean(req.body.confirmacion_poder),

        consulta_cen: toNullableString(req.body.consulta_cen),
        contenido_cen: toNullableString(req.body.contenido_cen),
        respuesta_cen: toNullableString(req.body.respuesta_cen),

        monto_devolucion: toNullableNumber(req.body.monto_devolucion),
        monto_pagado: toNullableNumber(req.body.monto_pagado),
        monto_cliente: toNullableNumber(req.body.monto_cliente),
        fee: toNullableNumber(req.body.fee),
        monto_finanfix_solutions: toNullableNumber(
          req.body.monto_finanfix_solutions
        ),

        facturado_finanfix: toNullableString(
          req.body.facturado_finanfix
        ),
        facturado_cliente: toNullableString(
          req.body.facturado_cliente
        ),
        numero_factura: toNullableString(req.body.numero_factura),
        numero_oc: toNullableString(req.body.numero_oc),

        comment: toNullableString(req.body.comment),
        last_activity_at: new Date(),
      },
      include: {
        mandante: true,
        company: true,
        line: true,
        lineAfp: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// =======================
// DELETE
// =======================
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