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

mandantesRouter.delete("/:id", async (req, res) => {
  try {
    const mandanteId = req.params.id;
    const force = String(req.query.force || "").toLowerCase() === "true";

    const mandante = await prisma.mandante.findUnique({
      where: { id: mandanteId },
      include: {
        _count: {
          select: { groups: true, companies: true, managements: true, lmRecords: true, tpRecords: true },
        },
      },
    });

    if (!mandante) return res.status(404).json({ message: "Mandante no encontrado." });

    const relatedCount =
      (mandante._count?.groups || 0) +
      (mandante._count?.companies || 0) +
      (mandante._count?.managements || 0) +
      (mandante._count?.lmRecords || 0) +
      (mandante._count?.tpRecords || 0);

    if (relatedCount > 0 && !force) {
      return res.status(409).json({
        message: "El mandante tiene información asociada. Confirma eliminación forzada para eliminar también sus gestiones, empresas, líneas y grupos.",
        counts: mandante._count,
        requiresForce: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      const managements = await tx.management.findMany({ where: { mandante_id: mandanteId }, select: { id: true } }).catch(() => []);
      const managementIds = managements.map((item) => item.id);

      if (managementIds.length) {
        await tx.document.deleteMany({ where: { OR: [{ management_id: { in: managementIds } }, { related_module: "records", related_record_id: { in: managementIds } }] } }).catch(() => null);
        await tx.note.deleteMany({ where: { OR: [{ management_id: { in: managementIds } }, { related_module: "records", related_record_id: { in: managementIds } }] } }).catch(() => null);
        await tx.activity.deleteMany({ where: { OR: [{ management_id: { in: managementIds } }, { related_module: "records", related_record_id: { in: managementIds } }] } }).catch(() => null);
      }

      const lines = await tx.managementLine.findMany({ where: { mandante_id: mandanteId }, select: { id: true } }).catch(() => []);
      const lineIds = lines.map((item: any) => item.id);

      await tx.lmRecord.deleteMany({ where: { mandante_id: mandanteId } }).catch(() => null);
      await tx.tpRecord.deleteMany({ where: { mandante_id: mandanteId } }).catch(() => null);
      await tx.management.deleteMany({ where: { mandante_id: mandanteId } }).catch(() => null);
      if (lineIds.length) await tx.managementLineAfp.deleteMany({ where: { line_id: { in: lineIds } } }).catch(() => null);
      await tx.managementLine.deleteMany({ where: { mandante_id: mandanteId } }).catch(() => null);
      await tx.company.deleteMany({ where: { mandante_id: mandanteId } }).catch(() => null);
      await tx.companyGroup.deleteMany({ where: { mandante_id: mandanteId } }).catch(() => null);
      await tx.$executeRawUnsafe(`update operafix_users set active = false, mandante_id = null, mandante_name = null, updated_at = now() where mandante_id = $1`, mandanteId).catch(() => null);
      await tx.mandante.delete({ where: { id: mandanteId } });
    });

    res.json({ ok: true, deletedMandante: mandante.name });
  } catch (error: any) {
    console.error("Error eliminando mandante:", error);
    res.status(500).json({ message: "No se pudo eliminar el mandante.", detail: error?.message || String(error) });
  }
});

export default mandantesRouter;
