import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

const managementLinesRouter = Router();

function toNullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function toNullableDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

// LISTAR LÍNEAS
managementLinesRouter.get("/", async (req, res, next) => {
  try {
    const mandanteId =
      typeof req.query.mandante_id === "string" ? req.query.mandante_id : undefined;
    const groupId =
      typeof req.query.group_id === "string" ? req.query.group_id : undefined;
    const companyId =
      typeof req.query.company_id === "string" ? req.query.company_id : undefined;
    const lineType =
      req.query.line_type === "LM" || req.query.line_type === "TP"
        ? req.query.line_type
        : undefined;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: Prisma.ManagementLineWhereInput = {
      mandante_id: mandanteId,
      group_id: groupId,
      company_id: companyId,
      line_type: lineType,
      OR: search
        ? [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            {
              owner_name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              portal_access: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              mes_produccion_2026: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              estado_contrato_cliente: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              consulta_cen: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              contenido_cen: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              respuesta_cen: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              comment: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ]
        : undefined,
    };

    const items = await prisma.managementLine.findMany({
      where,
      include: {
        mandante: true,
        group: true,
        company: true,
        afps: true,
        managements: true,
      },
      orderBy: [{ line_type: "asc" }, { created_at: "desc" }],
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

// OBTENER UNA LÍNEA
managementLinesRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.managementLine.findUnique({
      where: { id: req.params.id },
      include: {
        mandante: true,
        group: true,
        company: true,
        afps: {
          orderBy: { afp_name: "asc" },
        },
        managements: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Línea no encontrada" });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// CREAR LÍNEA
managementLinesRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.managementLine.create({
      data: {
        mandante_id: req.body.mandante_id,
        group_id: req.body.group_id || null,
        company_id: req.body.company_id,
        line_type: req.body.line_type === "TP" ? "TP" : "LM",
        name: toNullableString(req.body.name),
        owner_name: toNullableString(req.body.owner_name),
        portal_access: toNullableString(req.body.portal_access),
        mes_produccion_2026: toNullableString(req.body.mes_produccion_2026),
        comment: toNullableString(req.body.comment),
        estado_contrato_cliente: toNullableString(req.body.estado_contrato_cliente),
        fecha_termino_contrato: toNullableDate(req.body.fecha_termino_contrato),
        consulta_cen: toNullableString(req.body.consulta_cen),
        contenido_cen: toNullableString(req.body.contenido_cen),
        respuesta_cen: toNullableString(req.body.respuesta_cen),
        last_activity_at: new Date(),
      },
      include: {
        mandante: true,
        group: true,
        company: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// ACTUALIZAR LÍNEA
managementLinesRouter.put("/:id", async (req, res, next) => {
  try {
    const current = await prisma.managementLine.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ message: "Línea no encontrada" });
    }

    const item = await prisma.managementLine.update({
      where: { id: req.params.id },
      data: {
        mandante_id: req.body.mandante_id ?? current.mandante_id,
        group_id:
          req.body.group_id !== undefined ? req.body.group_id : current.group_id,
        company_id: req.body.company_id ?? current.company_id,
        line_type:
          req.body.line_type === "LM" || req.body.line_type === "TP"
            ? req.body.line_type
            : current.line_type,
        name: req.body.name !== undefined ? toNullableString(req.body.name) : current.name,
        owner_name:
          req.body.owner_name !== undefined
            ? toNullableString(req.body.owner_name)
            : current.owner_name,
        portal_access:
          req.body.portal_access !== undefined
            ? toNullableString(req.body.portal_access)
            : current.portal_access,
        mes_produccion_2026:
          req.body.mes_produccion_2026 !== undefined
            ? toNullableString(req.body.mes_produccion_2026)
            : current.mes_produccion_2026,
        comment:
          req.body.comment !== undefined
            ? toNullableString(req.body.comment)
            : current.comment,
        estado_contrato_cliente:
          req.body.estado_contrato_cliente !== undefined
            ? toNullableString(req.body.estado_contrato_cliente)
            : current.estado_contrato_cliente,
        fecha_termino_contrato:
          req.body.fecha_termino_contrato !== undefined
            ? toNullableDate(req.body.fecha_termino_contrato)
            : current.fecha_termino_contrato,
        consulta_cen:
          req.body.consulta_cen !== undefined
            ? toNullableString(req.body.consulta_cen)
            : current.consulta_cen,
        contenido_cen:
          req.body.contenido_cen !== undefined
            ? toNullableString(req.body.contenido_cen)
            : current.contenido_cen,
        respuesta_cen:
          req.body.respuesta_cen !== undefined
            ? toNullableString(req.body.respuesta_cen)
            : current.respuesta_cen,
        last_activity_at: new Date(),
      },
      include: {
        mandante: true,
        group: true,
        company: true,
        afps: true,
        managements: true,
      },
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// ELIMINAR LÍNEA
managementLinesRouter.delete("/:id", async (req, res, next) => {
  try {
    const current = await prisma.managementLine.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ message: "Línea no encontrada" });
    }

    await prisma.managementLine.delete({
      where: { id: req.params.id },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default managementLinesRouter;