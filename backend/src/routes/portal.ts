import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

const portalRouter = Router();

type PortalRecord = ReturnType<typeof normalizeRow>;

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret) as any;
  } catch {
    return null;
  }
}

function text(value: unknown, fallback = "") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function normalize(value: unknown) {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function moneyNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/\$/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  const v = normalize(value);
  return v === "si" || v === "true" || v === "1" || v.includes("confirmado") || v.includes("vigente");
}

function normalizeRow(row: any, type: "LM" | "TP") {
  return {
    id: row.management_id || row.id,
    source_id: row.id,
    management_type: type,
    mandante_id: row.mandante_id || null,
    mandante: row.mandante ? { id: row.mandante_id || "", name: row.mandante } : null,
    razon_social: row.business_name || row.razon_social || row.company_name || null,
    rut: row.rut || row.company_rut || null,
    entidad: row.entity || row.entidad || row.afp_name || null,
    estado_gestion: row.management_status || row.estado_gestion || null,
    monto_devolucion: moneyNumber(row.refund_amount ?? row.monto_devolucion),
    monto_pagado: moneyNumber(row.actual_paid_amount ?? row.monto_pagado),
    numero_solicitud: row.request_number || row.numero_solicitud || null,
    grupo_empresa: row.search_group || row.grupo_empresa || null,
    confirmacion_cc: bool(row.confirmation_cc ?? row.confirmacion_cc),
    confirmacion_poder: bool(row.confirmation_power ?? row.confirmacion_poder),
    fecha_pago_afp: row.afp_payment_date || row.fecha_pago_afp || null,
    fecha_presentacion_afp: row.afp_submission_date || row.fecha_presentacion_afp || null,
    fecha_ingreso_afp: row.afp_entry_date || row.fecha_ingreso_afp || null,
    motivo_tipo_exceso: row.excess_type_reason || row.motivo_tipo_exceso || type,
    comment: row.comment || null,
    documents: [] as any[],
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_activity_at: row.last_activity_at,
  };
}

function filterBySession(rows: PortalRecord[], session: any) {
  const role = String(session.role || "").toLowerCase();
  if (role !== "cliente") return rows;

  const mandanteId = text(session.mandante_id);
  const mandanteName = normalize(session.mandante_name);

  if (!mandanteId && !mandanteName) return [];

  return rows.filter((row) => {
    if (mandanteId && String(row.mandante_id || "") === mandanteId) return true;
    if (mandanteName && normalize(row.mandante?.name).includes(mandanteName)) return true;
    return false;
  });
}

async function loadDocuments(recordIds: string[]) {
  if (!recordIds.length) return new Map<string, any[]>();

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
      SELECT *
      FROM documents
      WHERE COALESCE(related_record_id, management_id) = ANY($1::text[])
      ORDER BY created_at DESC NULLS LAST
    `,
    recordIds
  ).catch(() => [] as any[]);

  const map = new Map<string, any[]>();
  for (const doc of rows) {
    const key = String(doc.related_record_id || doc.management_id || "");
    if (!key) continue;
    const current = map.get(key) || [];
    current.push(doc);
    map.set(key, current);
  }
  return map;
}

portalRouter.get("/records", async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) return res.status(401).json({ message: "Debes iniciar sesión." });

    const [lm, tp] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT *
        FROM lm_records
        ORDER BY created_at DESC NULLS LAST
        LIMIT 5000
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT *
        FROM tp_records
        ORDER BY created_at DESC NULLS LAST
        LIMIT 5000
      `),
    ]);

    let rows: any[] = [
      ...lm.map((row: any) => normalizeRow(row, "LM")),
      ...tp.map((row: any) => normalizeRow(row, "TP")),
    ];

    rows = filterBySession(rows, session);

    const docsByRecord = await loadDocuments(rows.map((row: any) => String(row.id)));
    rows = rows.map((row: any) => ({ ...row, documents: docsByRecord.get(String(row.id)) || [] }));

    res.json(rows);
  } catch (error: any) {
    console.error("ERROR /api/portal/records:", error?.message || error);
    res.status(500).json({ message: "No se pudieron cargar los registros del portal.", detail: String(error?.message || error) });
  }
});

portalRouter.get("/summary", async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) return res.status(401).json({ message: "Debes iniciar sesión." });

    const [lm, tp] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM lm_records ORDER BY created_at DESC NULLS LAST LIMIT 5000`),
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM tp_records ORDER BY created_at DESC NULLS LAST LIMIT 5000`),
    ]);

    let rows: any[] = [
      ...lm.map((row: any) => normalizeRow(row, "LM")),
      ...tp.map((row: any) => normalizeRow(row, "TP")),
    ];
    rows = filterBySession(rows, session);

    const byStatus: Record<string, { count: number; amount: number }> = {};
    const byEntity: Record<string, { count: number; amount: number }> = {};

    for (const row of rows) {
      const status = text(row.estado_gestion, "Sin estado");
      const entity = text(row.entidad, "Sin entidad");
      byStatus[status] = byStatus[status] || { count: 0, amount: 0 };
      byEntity[entity] = byEntity[entity] || { count: 0, amount: 0 };
      byStatus[status].count += 1;
      byStatus[status].amount += row.monto_devolucion;
      byEntity[entity].count += 1;
      byEntity[entity].amount += row.monto_devolucion;
    }

    res.json({
      total: rows.length,
      amount: rows.reduce((acc, row) => acc + row.monto_devolucion, 0),
      paid: rows.reduce((acc, row) => acc + row.monto_pagado, 0),
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, ...value })),
      byEntity: Object.entries(byEntity).map(([name, value]) => ({ name, ...value })),
    });
  } catch (error: any) {
    console.error("ERROR /api/portal/summary:", error?.message || error);
    res.status(500).json({ message: "No se pudo generar resumen del portal.", detail: String(error?.message || error) });
  }
});

export default portalRouter;
