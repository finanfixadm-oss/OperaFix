import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

const portalRouter = Router();

type RawRow = Record<string, any>;

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret) as any;
  } catch {
    return null;
  }
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "si" || raw === "sí";
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeRow(row: any, type: "LM" | "TP") {
  const mandanteName = row.mandante || row.mandante_name || row.client_name || null;
  const razonSocial = row.business_name || row.razon_social || row.company_name || null;
  const rut = row.rut || row.company_rut || null;
  const entidad = row.entity || row.entidad || row.afp_name || null;

  return {
    id: row.management_id || row.id,
    source_id: row.id,
    management_type: type,
    mandante_id: row.mandante_id || null,
    mandante: mandanteName ? { id: row.mandante_id || "", name: mandanteName } : null,
    razon_social: razonSocial,
    rut,
    entidad,
    estado_gestion: row.management_status || row.estado_gestion || null,
    monto_devolucion: row.refund_amount ?? row.monto_devolucion ?? 0,
    monto_pagado: row.actual_paid_amount ?? row.monto_pagado ?? 0,
    monto_cliente: row.client_amount ?? row.monto_cliente ?? 0,
    monto_finanfix_solutions: row.finanfix_amount ?? row.monto_finanfix_solutions ?? 0,
    monto_real_cliente: row.actual_client_amount ?? row.monto_real_cliente ?? 0,
    monto_real_finanfix_solutions: row.actual_finanfix_amount ?? row.monto_real_finanfix_solutions ?? 0,
    fee: row.fee ?? 0,
    numero_solicitud: row.request_number || row.numero_solicitud || null,
    grupo_empresa: row.search_group || row.grupo_empresa || null,
    confirmacion_cc: bool(row.confirmation_cc ?? row.confirmacion_cc),
    confirmacion_poder: bool(row.confirmation_power ?? row.confirmacion_poder),
    fecha_pago_afp: row.afp_payment_date || row.fecha_pago_afp || null,
    fecha_presentacion_afp: row.afp_submission_date || row.fecha_presentacion_afp || null,
    fecha_ingreso_afp: row.afp_entry_date || row.fecha_ingreso_afp || null,
    motivo_tipo_exceso: row.excess_type_reason || row.motivo_tipo_exceso || type,
    banco: row.bank_name || row.banco || null,
    tipo_cuenta: row.account_type || row.tipo_cuenta || null,
    numero_cuenta: row.account_number || row.numero_cuenta || null,
    acceso_portal: row.portal_access || row.acceso_portal || null,
    documents: [] as any[],
    company: { razon_social: razonSocial, rut },
    lineAfp: { afp_name: entidad },
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_activity_at: row.last_activity_at,
  };
}

function visibleForClient(row: any, session: any) {
  const role = String(session.role || "").toLowerCase();
  if (role !== "cliente") return true;

  const sessionMandanteId = String(session.mandante_id || "");
  const sessionMandanteName = normalizeText(session.mandante_name);

  if (!sessionMandanteId && !sessionMandanteName) return false;

  const rowMandanteId = String(row.mandante_id || "");
  const rowMandanteName = normalizeText(row.mandante?.name || row.mandante);

  return Boolean(
    (sessionMandanteId && rowMandanteId === sessionMandanteId) ||
      (sessionMandanteName && rowMandanteName === sessionMandanteName)
  );
}

async function loadDocuments(recordIds: string[]) {
  if (!recordIds.length) return new Map<string, any[]>();

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT *
        FROM documents
        WHERE related_record_id = ANY($1::text[])
           OR management_id = ANY($1::text[])
        ORDER BY created_at DESC NULLS LAST
      `,
      recordIds
    );

    const map = new Map<string, any[]>();
    for (const doc of rows) {
      const key = String(doc.related_record_id || doc.management_id || "");
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(doc);
      map.set(key, list);
    }
    return map;
  } catch (error) {
    console.warn("No se pudieron cargar documentos del portal:", error);
    return new Map<string, any[]>();
  }
}

portalRouter.get("/records", async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) return res.status(401).json({ message: "Debes iniciar sesión." });

    const [lm, tp] = await Promise.all([
      prisma.$queryRawUnsafe<RawRow[]>(`
        SELECT *
        FROM lm_records
        ORDER BY created_at DESC NULLS LAST
        LIMIT 5000
      `),
      prisma.$queryRawUnsafe<RawRow[]>(`
        SELECT *
        FROM tp_records
        ORDER BY created_at DESC NULLS LAST
        LIMIT 5000
      `),
    ]);

    let rows: any[] = [
      ...lm.map((row) => normalizeRow(row, "LM")),
      ...tp.map((row) => normalizeRow(row, "TP")),
    ].filter((row) => visibleForClient(row, session));

    const docsByRecord = await loadDocuments(rows.map((row) => String(row.id)).filter(Boolean));
    rows = rows.map((row) => ({ ...row, documents: docsByRecord.get(String(row.id)) || [] }));

    res.json(rows);
  } catch (error: any) {
    console.error("ERROR /api/portal/records:", error?.message || error);
    res.status(500).json({
      message: "No se pudo cargar el portal cliente.",
      detail: String(error?.message || error),
    });
  }
});

portalRouter.get("/summary", async (req, res) => {
  try {
    const session = getSession(req);
    if (!session) return res.status(401).json({ message: "Debes iniciar sesión." });

    const [lm, tp] = await Promise.all([
      prisma.$queryRawUnsafe<RawRow[]>(`SELECT * FROM lm_records LIMIT 5000`),
      prisma.$queryRawUnsafe<RawRow[]>(`SELECT * FROM tp_records LIMIT 5000`),
    ]);

    const rows = [
      ...lm.map((row) => normalizeRow(row, "LM")),
      ...tp.map((row) => normalizeRow(row, "TP")),
    ].filter((row) => visibleForClient(row, session));

    const amount = rows.reduce((sum, row) => sum + Number(row.monto_devolucion || 0), 0);
    const paid = rows.filter((row) => /pag|factur|cerr/i.test(String(row.estado_gestion || ""))).length;
    const pending = rows.filter((row) => /pend|ingres|envi|present/i.test(String(row.estado_gestion || ""))).length;
    const rejected = rows.filter((row) => /rechaz/i.test(String(row.estado_gestion || ""))).length;

    res.json({ count: rows.length, amount, paid, pending, rejected });
  } catch (error: any) {
    res.status(500).json({ message: "No se pudo cargar resumen del portal.", detail: String(error?.message || error) });
  }
});

export default portalRouter;
