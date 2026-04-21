import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

export const lmRecordsRouter = Router();

function parseBoolean(input: unknown) {
  if (
    input === true ||
    input === "true" ||
    input === "1" ||
    input === 1 ||
    input === "si" ||
    input === "sí" ||
    input === "Si" ||
    input === "Sí"
  )
    return true;

  if (
    input === false ||
    input === "false" ||
    input === "0" ||
    input === 0 ||
    input === "no" ||
    input === "No"
  )
    return false;

  return undefined;
}

function decimalOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

lmRecordsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100);
    const search = String(req.query.search || "").trim();
    const entity = String(req.query.entity || "").trim();
    const management_status = String(req.query.management_status || "").trim();
    const mandante = String(req.query.mandante || "").trim();
    const confirmation_cc = parseBoolean(req.query.confirmation_cc);
    const confirmation_power = parseBoolean(req.query.confirmation_power);

    const where: Prisma.LmRecordWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { rut: { contains: search, mode: Prisma.QueryMode.insensitive } },
                {
                  business_name: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  search_group: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  request_number: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : {},
        entity
          ? { entity: { equals: entity, mode: Prisma.QueryMode.insensitive } }
          : {},
        management_status
          ? {
              management_status: {
                equals: management_status,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {},
        mandante
          ? { mandante: { equals: mandante, mode: Prisma.QueryMode.insensitive } }
          : {},
        confirmation_cc === undefined ? {} : { confirmation_cc },
        confirmation_power === undefined ? {} : { confirmation_power },
      ],
    };

    const [items, total, entities, statuses, mandantes] = await Promise.all([
      prisma.lmRecord.findMany({
        where,
        orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lmRecord.count({ where }),
      prisma.lmRecord.findMany({
        distinct: ["entity"],
        select: { entity: true },
        where: { entity: { not: null } },
        orderBy: { entity: "asc" },
      }),
      prisma.lmRecord.findMany({
        distinct: ["management_status"],
        select: { management_status: true },
        where: { management_status: { not: null } },
        orderBy: { management_status: "asc" },
      }),
      prisma.lmRecord.findMany({
        distinct: ["mandante"],
        select: { mandante: true },
        where: { mandante: { not: null } },
        orderBy: { mandante: "asc" },
      }),
    ]);

    res.json({
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
      filterOptions: {
        entities: entities
          .map((x: { entity: string | null }) => x.entity)
          .filter(Boolean),
        statuses: statuses
          .map((x: { management_status: string | null }) => x.management_status)
          .filter(Boolean),
        mandantes: mandantes
          .map((x: { mandante: string | null }) => x.mandante)
          .filter(Boolean),
      },
    });
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.get("/:id", async (req, res, next) => {
  try {
    const record = await prisma.lmRecord.findUnique({ where: { id: req.params.id } });

    if (!record) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    const [notes, activities, documents] = await Promise.all([
      prisma.note.findMany({
        where: { related_module: "lm_records", related_record_id: req.params.id },
        orderBy: { created_at: "desc" },
      }),
      prisma.activity.findMany({
        where: { related_module: "lm_records", related_record_id: req.params.id },
        orderBy: { created_at: "desc" },
      }),
      prisma.document.findMany({
        where: { related_module: "lm_records", related_record_id: req.params.id },
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ record, notes, activities, documents });
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.post("/", async (req, res, next) => {
  try {
    if (
      req.body.management_status === "Enviado AFP" &&
      (!parseBoolean(req.body.confirmation_cc) ||
        !parseBoolean(req.body.confirmation_power))
    ) {
      return res.status(400).json({
        message:
          "No se puede avanzar a 'Enviado AFP' sin Confirmación CC y Confirmación Poder en Sí.",
      });
    }

    const item = await prisma.lmRecord.create({
      data: {
        lm_group_id: req.body.lm_group_id || null,
        search_group: req.body.search_group || null,
        rut: req.body.rut,
        entity: req.body.entity || null,
        management_status: req.body.management_status || null,
        refund_amount: decimalOrNull(req.body.refund_amount),
        confirmation_cc: parseBoolean(req.body.confirmation_cc) ?? false,
        confirmation_power: parseBoolean(req.body.confirmation_power) ?? false,
        actual_paid_amount: decimalOrNull(req.body.actual_paid_amount),
        excess_type_reason: req.body.excess_type_reason || null,
        worker_status: req.body.worker_status || null,
        request_number: req.body.request_number || null,
        business_name: req.body.business_name || null,
        bank_name: req.body.bank_name || null,
        account_number: req.body.account_number || null,
        account_type: req.body.account_type || null,
        comment: req.body.comment || null,
        mandante: req.body.mandante || null,
        portal_access: req.body.portal_access || null,
        last_activity_at: new Date(),
      },
    });

    await prisma.activity.create({
      data: {
        related_module: "lm_records",
        related_record_id: item.id,
        activity_type: "created",
        description: "Registro creado en OperaFix",
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.put("/:id", async (req, res, next) => {
  try {
    const current = await prisma.lmRecord.findUnique({ where: { id: req.params.id } });

    if (!current) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    const nextStatus = req.body.management_status ?? current.management_status;
    const nextCC =
      parseBoolean(req.body.confirmation_cc) ?? current.confirmation_cc ?? false;
    const nextPower =
      parseBoolean(req.body.confirmation_power) ?? current.confirmation_power ?? false;

    if (nextStatus === "Enviado AFP" && (!nextCC || !nextPower)) {
      return res.status(400).json({
        message:
          "No se puede avanzar a 'Enviado AFP' sin Confirmación CC y Confirmación Poder en Sí.",
      });
    }

    const updated = await prisma.lmRecord.update({
      where: { id: req.params.id },
      data: {
        search_group: req.body.search_group ?? current.search_group,
        rut: req.body.rut ?? current.rut,
        entity: req.body.entity ?? current.entity,
        management_status: nextStatus,
        refund_amount: decimalOrNull(req.body.refund_amount) ?? current.refund_amount,
        confirmation_cc: nextCC,
        confirmation_power: nextPower,
        actual_paid_amount:
          decimalOrNull(req.body.actual_paid_amount) ?? current.actual_paid_amount,
        excess_type_reason:
          req.body.excess_type_reason ?? current.excess_type_reason,
        worker_status: req.body.worker_status ?? current.worker_status,
        request_number: req.body.request_number ?? current.request_number,
        business_name: req.body.business_name ?? current.business_name,
        bank_name: req.body.bank_name ?? current.bank_name,
        account_number: req.body.account_number ?? current.account_number,
        account_type: req.body.account_type ?? current.account_type,
        comment: req.body.comment ?? current.comment,
        mandante: req.body.mandante ?? current.mandante,
        portal_access: req.body.portal_access ?? current.portal_access,
        last_activity_at: new Date(),
        updated_at: new Date(),
      },
    });

    await prisma.activity.create({
      data: {
        related_module: "lm_records",
        related_record_id: updated.id,
        activity_type: "updated",
        description: `Registro actualizado. Estado: ${
          updated.management_status || "Sin estado"
        }`,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.post("/:id/notes", async (req, res, next) => {
  try {
    if (!req.body.content?.trim()) {
      return res.status(400).json({ message: "La nota no puede ir vacía" });
    }

    const note = await prisma.note.create({
      data: {
        related_module: "lm_records",
        related_record_id: req.params.id,
        content: String(req.body.content).trim(),
      },
    });

    await prisma.activity.create({
      data: {
        related_module: "lm_records",
        related_record_id: req.params.id,
        activity_type: "note",
        description: "Se agregó una nota al registro",
      },
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});