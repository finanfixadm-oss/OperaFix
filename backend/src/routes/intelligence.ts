import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

type ManagementType = "LM" | "TP";

type SmartRecord = {
  id: string;
  management_type: ManagementType;
  mandante: string;
  business_name: string;
  rut: string;
  entity: string;
  management_status: string;
  refund_amount: number;
  actual_paid_amount: number;
  confirmation_cc: boolean;
  confirmation_power: boolean;
  request_number: string;
  search_group: string;
  documents_count: number;
  created_at: string | null;
  updated_at: string | null;
  last_activity_at: string | null;
  score: number;
  score_reasons: string[];
  blockers: string[];
  next_action: string;
};

function text(value: unknown, fallback = ""): string {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function normalize(value: unknown): string {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function moneyNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function truthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const v = normalize(value);
  return v === "si" || v === "true" || v === "1" || v.includes("confirmado") || v.includes("vigente");
}

function daysSince(value: unknown): number {
  if (!value) return 999;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function statusKind(status: unknown) {
  const s = normalize(status);
  if (s.includes("rechaz")) return "rechazado";
  if (s.includes("pag") || s.includes("factur") || s.includes("cerrad")) return "cerrado";
  if (s.includes("gestionado")) return "gestionado";
  if (s.includes("pendiente")) return "pendiente";
  if (s.includes("envi") || s.includes("present")) return "enviado";
  return "otro";
}

function legacyRow(row: any, type: ManagementType): SmartRecord {
  const status = text(row.management_status || row.estado_gestion, "Pendiente Gestión");
  const amount = moneyNumber(row.refund_amount ?? row.monto_devolucion);
  const cc = truthy(row.confirmation_cc ?? row.confirmacion_cc);
  const power = truthy(row.confirmation_power ?? row.confirmacion_poder);
  const docs = moneyNumber(row.documents_count);
  const kind = statusKind(status);
  const age = daysSince(row.last_activity_at || row.updated_at || row.created_at);

  const blockers: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  if (kind === "pendiente") {
    score += 18;
    reasons.push("estado pendiente");
  }
  if (kind === "gestionado" || kind === "enviado") {
    score += 8;
    reasons.push("gestión ya iniciada");
  }
  if (cc) {
    score += 18;
    reasons.push("CC confirmada");
  } else {
    blockers.push("falta confirmación CC");
  }
  if (power) {
    score += 18;
    reasons.push("poder confirmado");
  } else {
    blockers.push("falta confirmación poder");
  }
  if (amount >= 1000000) {
    score += 18;
    reasons.push("monto alto");
  } else if (amount > 0) {
    score += 10;
    reasons.push("monto disponible");
  } else {
    blockers.push("sin monto devolución");
  }
  if (text(row.entity || row.entidad || row.afp_name)) {
    score += 8;
    reasons.push("entidad asignada");
  } else {
    blockers.push("sin AFP/entidad");
  }
  if (text(row.request_number || row.numero_solicitud)) {
    score += 7;
    reasons.push("N° solicitud disponible");
  }
  if (docs > 0) {
    score += 6;
    reasons.push("documentos cargados");
  } else {
    blockers.push("sin documentos asociados");
  }
  if (age > 30 && kind !== "cerrado") {
    score -= 12;
    blockers.push("más de 30 días sin actividad");
  }
  if (kind === "rechazado") {
    score -= 25;
    blockers.push("caso rechazado");
  }
  if (kind === "cerrado") score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let nextAction = "Revisar datos del caso";
  if (!cc) nextAction = "Solicitar o confirmar cuenta corriente";
  else if (!power) nextAction = "Solicitar o actualizar poder";
  else if (!docs) nextAction = "Cargar documentos de respaldo";
  else if (kind === "pendiente") nextAction = "Preparar y presentar gestión ante AFP";
  else if (kind === "gestionado" || kind === "enviado") nextAction = "Hacer seguimiento con AFP";
  else if (kind === "rechazado") nextAction = "Analizar motivo de rechazo y preparar subsanación";
  else if (kind === "cerrado") nextAction = "Validar facturación y cierre administrativo";

  return {
    id: text(row.management_id || row.id),
    management_type: type,
    mandante: text(row.mandante || row.mandante_name || row.client_name, "Sin mandante"),
    business_name: text(row.business_name || row.razon_social || row.company_name, "Sin razón social"),
    rut: text(row.rut || row.company_rut),
    entity: text(row.entity || row.entidad || row.afp_name, "Sin entidad"),
    management_status: status,
    refund_amount: amount,
    actual_paid_amount: moneyNumber(row.actual_paid_amount ?? row.monto_pagado),
    confirmation_cc: cc,
    confirmation_power: power,
    request_number: text(row.request_number || row.numero_solicitud),
    search_group: text(row.search_group || row.grupo_empresa),
    documents_count: docs,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_activity_at: row.last_activity_at || null,
    score,
    score_reasons: reasons,
    blockers,
    next_action: nextAction,
  };
}

async function loadSmartRecords(): Promise<SmartRecord[]> {
  const [lm, tp] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`
      SELECT r.*, COALESCE(d.documents_count, 0)::int AS documents_count
      FROM lm_records r
      LEFT JOIN (
        SELECT COALESCE(related_record_id, management_id) AS record_id, COUNT(*) AS documents_count
        FROM documents
        WHERE COALESCE(related_record_id, management_id) IS NOT NULL
        GROUP BY COALESCE(related_record_id, management_id)
      ) d ON d.record_id = COALESCE(r.management_id, r.id)
      ORDER BY r.created_at DESC NULLS LAST
      LIMIT 5000
    `),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT r.*, COALESCE(d.documents_count, 0)::int AS documents_count
      FROM tp_records r
      LEFT JOIN (
        SELECT COALESCE(related_record_id, management_id) AS record_id, COUNT(*) AS documents_count
        FROM documents
        WHERE COALESCE(related_record_id, management_id) IS NOT NULL
        GROUP BY COALESCE(related_record_id, management_id)
      ) d ON d.record_id = COALESCE(r.management_id, r.id)
      ORDER BY r.created_at DESC NULLS LAST
      LIMIT 5000
    `),
  ]);

  return [...lm.map((row: any) => legacyRow(row, "LM")), ...tp.map((row: any) => legacyRow(row, "TP"))];
}

function filterRecords(records: SmartRecord[], req: express.Request) {
  const mandante = normalize(req.query.mandante);
  const entity = normalize(req.query.entity);
  const status = normalize(req.query.status);
  const type = normalize(req.query.type);

  return records.filter((row) => {
    if (mandante && !normalize(row.mandante).includes(mandante)) return false;
    if (entity && !normalize(row.entity).includes(entity)) return false;
    if (status && !normalize(row.management_status).includes(status)) return false;
    if (type && normalize(row.management_type) !== type) return false;
    return true;
  });
}

function sum(rows: SmartRecord[], field: keyof SmartRecord) {
  return rows.reduce((acc, row) => acc + moneyNumber(row[field]), 0);
}

function group(rows: SmartRecord[], key: keyof SmartRecord) {
  const map = new Map<string, { name: string; count: number; amount: number }>();
  for (const row of rows) {
    const name = text(row[key], "Sin información");
    const current = map.get(name) || { name, count: 0, amount: 0 };
    current.count += 1;
    current.amount += row.refund_amount;
    map.set(name, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || b.count - a.count);
}

router.get("/summary", async (req, res) => {
  try {
    const all = await loadSmartRecords();
    const records = filterRecords(all, req);
    const ready = records.filter((r) => r.confirmation_cc && r.confirmation_power && r.refund_amount > 0 && statusKind(r.management_status) === "pendiente");
    const blockedPower = records.filter((r) => !r.confirmation_power);
    const blockedCc = records.filter((r) => !r.confirmation_cc);
    const dormant = records.filter((r) => daysSince(r.last_activity_at || r.updated_at || r.created_at) > 30 && statusKind(r.management_status) !== "cerrado");
    const rejected = records.filter((r) => statusKind(r.management_status) === "rechazado");
    const paid = records.filter((r) => statusKind(r.management_status) === "cerrado");

    const topMandante = group(records, "mandante")[0];
    const topEntity = group(records, "entity")[0];

    const insights = [
      `Hay ${ready.length} casos listos para gestionar por $${sum(ready, "refund_amount").toLocaleString("es-CL")}.`,
      `Los bloqueos principales son: ${blockedPower.length} sin poder y ${blockedCc.length} sin CC confirmada.`,
      topEntity ? `${topEntity.name} concentra $${Math.round(topEntity.amount).toLocaleString("es-CL")} en ${topEntity.count} casos.` : "Sin AFP dominante en la vista actual.",
      topMandante ? `${topMandante.name} concentra $${Math.round(topMandante.amount).toLocaleString("es-CL")} en ${topMandante.count} casos.` : "Sin mandante dominante en la vista actual.",
      dormant.length ? `${dormant.length} casos llevan más de 30 días sin actividad.` : "No hay casos dormidos críticos en esta vista.",
    ];

    res.json({
      totals: {
        records: records.length,
        refund_amount: sum(records, "refund_amount"),
        actual_paid_amount: sum(records, "actual_paid_amount"),
        ready_count: ready.length,
        ready_amount: sum(ready, "refund_amount"),
        blocked_power: blockedPower.length,
        blocked_cc: blockedCc.length,
        dormant: dormant.length,
        rejected: rejected.length,
        paid: paid.length,
      },
      insights,
      rankings: {
        byMandante: group(records, "mandante").slice(0, 10),
        byEntity: group(records, "entity").slice(0, 10),
        byStatus: group(records, "management_status").slice(0, 10),
      },
      priorities: records.sort((a, b) => b.score - a.score || b.refund_amount - a.refund_amount).slice(0, 25),
      blockers: {
        power: blockedPower.slice(0, 25),
        cc: blockedCc.slice(0, 25),
        dormant: dormant.slice(0, 25),
      },
    });
  } catch (error: any) {
    console.error("ERROR /api/intelligence/summary:", error?.message || error);
    res.status(500).json({ message: "No se pudo generar inteligencia operacional.", detail: String(error?.message || error) });
  }
});

router.get("/priorities", async (req, res) => {
  try {
    const all = await loadSmartRecords();
    const records = filterRecords(all, req);
    res.json(records.sort((a, b) => b.score - a.score || b.refund_amount - a.refund_amount).slice(0, 100));
  } catch (error: any) {
    console.error("ERROR /api/intelligence/priorities:", error?.message || error);
    res.status(500).json({ message: "No se pudieron generar prioridades.", detail: String(error?.message || error) });
  }
});

export default router;
