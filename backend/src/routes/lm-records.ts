import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export const lmRecordsRouter = Router();

const parseBoolean = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase();
  if (["true", "1", "si", "sí", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return undefined;
};

const parseNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(String(value).replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

function normalizePayload(body: any) {
  const managementStatus = body.management_status ?? body.managementStatus;
  const confirmationCC = parseBoolean(body.confirmation_cc ?? body.confirmationCC);
  const confirmationPower = parseBoolean(body.confirmation_power ?? body.confirmationPower);

  if (
    managementStatus === "Enviado AFP" &&
    (!confirmationCC || !confirmationPower)
  ) {
    const error: any = new Error(
      "No se puede avanzar a 'Enviado AFP' sin Confirmación CC y Confirmación Poder en Sí."
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    lm_group_id: body.lm_group_id || null,
    search_group: body.search_group || body.business_name || null,
    rut: body.rut,
    entity: body.entity || null,
    management_status: managementStatus || null,
    refund_amount: parseNumber(body.refund_amount),
    confirmation_cc: confirmationCC ?? false,
    confirmation_power: confirmationPower ?? false,
    actual_paid_amount: parseNumber(body.actual_paid_amount),
    excess_type_reason: body.excess_type_reason || null,
    worker_status: body.worker_status || null,
    request_number: body.request_number || null,
    business_name: body.business_name || null,
    actual_finanfix_amount: parseNumber(body.actual_finanfix_amount),
    production_months: body.production_months || null,
    invoice_number: body.invoice_number || null,
    bank_name: body.bank_name || null,
    account_number: body.account_number || null,
    account_type: body.account_type || null,
    client_contract_status: body.client_contract_status || null,
    fee: parseNumber(body.fee),
    comment: body.comment || null,
    mandante: body.mandante || null,
    portal_access: body.portal_access || null,
    connected_to: body.connected_to || null,
    request_entry_month: body.request_entry_month || null,
    afp_shipment: body.afp_shipment || null,
    cen_response: body.cen_response || null,
    cen_query: body.cen_query || null,
    cen_content: body.cen_content || null,
    note_badge: parseBoolean(body.note_badge) ?? undefined,
    activity_badge: parseBoolean(body.activity_badge) ?? undefined
  };
}

lmRecordsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const q = String(req.query.q || "").trim();
    const entity = String(req.query.entity || "").trim();
    const managementStatus = String(req.query.management_status || "").trim();
    const confirmationCC = parseBoolean(req.query.confirmation_cc);
    const confirmationPower = parseBoolean(req.query.confirmation_power);
    const mandante = String(req.query.mandante || "").trim();

    const where: Prisma.LmRecordWhereInput = {
      AND: [
        q
          ? {
              OR: [
                { rut: { contains: q, mode: "insensitive" } },
                { business_name: { contains: q, mode: "insensitive" } },
                { search_group: { contains: q, mode: "insensitive" } },
                { entity: { contains: q, mode: "insensitive" } },
                { request_number: { contains: q, mode: "insensitive" } }
              ]
            }
          : {},
        entity ? { entity } : {},
        managementStatus ? { management_status: managementStatus } : {},
        confirmationCC === undefined ? {} : { confirmation_cc: confirmationCC },
        confirmationPower === undefined ? {} : { confirmation_power: confirmationPower },
        mandante ? { mandante: { contains: mandante, mode: "insensitive" } } : {}
      ]
    };

    const [items, total, entities, statuses] = await Promise.all([
      prisma.lmRecord.findMany({
        where,
        orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.lmRecord.count({ where }),
      prisma.lmRecord.findMany({
        distinct: ["entity"],
        select: { entity: true },
        where: { entity: { not: null } },
        orderBy: { entity: "asc" }
      }),
      prisma.lmRecord.findMany({
        distinct: ["management_status"],
        select: { management_status: true },
        where: { management_status: { not: null } },
        orderBy: { management_status: "asc" }
      })
    ]);

    res.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      },
      filters: {
        entities: entities.map((x) => x.entity).filter(Boolean),
        statuses: statuses.map((x) => x.management_status).filter(Boolean)
      }
    });
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.lmRecord.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: "Registro no encontrado" });

    const [notes, activities, documents] = await Promise.all([
      prisma.note.findMany({
        where: { related_module: "lm_records", related_record_id: item.id },
        orderBy: { created_at: "desc" }
      }),
      prisma.activity.findMany({
        where: { related_module: "lm_records", related_record_id: item.id },
        orderBy: { created_at: "desc" }
      }),
      prisma.document.findMany({
        where: { related_module: "lm_records", related_record_id: item.id },
        orderBy: { created_at: "desc" }
      })
    ]);

    res.json({ ...item, notes, activities, documents });
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.post("/", async (req, res, next) => {
  try {
    const data = normalizePayload(req.body);
    const item = await prisma.lmRecord.create({ data: data as any });
    await prisma.activity.create({
      data: {
        related_module: "lm_records",
        related_record_id: item.id,
        activity_type: "create",
        description: `Registro creado para ${item.rut}`
      }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.put("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.lmRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Registro no encontrado" });

    const data = normalizePayload(req.body);
    const item = await prisma.lmRecord.update({
      where: { id: req.params.id },
      data: {
        ...(data as any),
        updated_at: new Date()
      }
    });

    await prisma.activity.create({
      data: {
        related_module: "lm_records",
        related_record_id: item.id,
        activity_type: "update",
        description: `Registro actualizado: ${item.management_status || "Sin estado"}`
      }
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.post("/:id/notes", async (req, res, next) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ message: "La nota es obligatoria" });

    const note = await prisma.note.create({
      data: {
        related_module: "lm_records",
        related_record_id: req.params.id,
        content
      }
    });

    await prisma.lmRecord.update({
      where: { id: req.params.id },
      data: { note_badge: true, last_activity_at: new Date() }
    });

    await prisma.activity.create({
      data: {
        related_module: "lm_records",
        related_record_id: req.params.id,
        activity_type: "note",
        description: "Se agregó una nota al registro"
      }
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.get("/:id/notes", async (req, res, next) => {
  try {
    const notes = await prisma.note.findMany({
      where: { related_module: "lm_records", related_record_id: req.params.id },
      orderBy: { created_at: "desc" }
    });
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

lmRecordsRouter.get("/:id/activities", async (req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { related_module: "lm_records", related_record_id: req.params.id },
      orderBy: { created_at: "desc" }
    });
    res.json(activities);
  } catch (error) {
    next(error);
  }
});
