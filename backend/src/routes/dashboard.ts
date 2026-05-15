import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

type DashboardRecord = {
  id: string;
  management_type: "LM" | "TP";
  mandante: string;
  entity: string;
  status: string;
  business_name: string;
  rut: string;
  refund_amount: number;
  actual_paid_amount: number;
  confirmation_cc: boolean;
  confirmation_power: boolean;
  documents_count: number;
  created_at: string | null;
  updated_at: string | null;
  last_activity_at: string | null;
};

function text(value: unknown, fallback = "Sin información") {
  const raw = String(value ?? "").trim();
  return raw || fallback;
}

function normalize(value: unknown) {
  return String(value ?? "")
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

function daysSince(value: unknown) {
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

function mapRow(row: any, type: "LM" | "TP"): DashboardRecord {
  return {
    id: text(row.management_id || row.id, ""),
    management_type: type,
    mandante: text(row.mandante || row.mandante_name || row.client_name, "Sin mandante"),
    entity: text(row.entity || row.entidad || row.afp_name, "Sin entidad"),
    status: text(row.management_status || row.estado_gestion, "Sin estado"),
    business_name: text(row.business_name || row.razon_social || row.company_name, "Sin razón social"),
    rut: text(row.rut || row.company_rut, ""),
    refund_amount: moneyNumber(row.refund_amount ?? row.monto_devolucion),
    actual_paid_amount: moneyNumber(row.actual_paid_amount ?? row.monto_pagado),
    confirmation_cc: bool(row.confirmation_cc ?? row.confirmacion_cc),
    confirmation_power: bool(row.confirmation_power ?? row.confirmacion_poder),
    documents_count: moneyNumber(row.documents_count),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_activity_at: row.last_activity_at || null,
  };
}

async function loadRecords() {
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

  return [...lm.map((row: any) => mapRow(row, "LM")), ...tp.map((row: any) => mapRow(row, "TP"))];
}

function groupBy(records: DashboardRecord[], key: keyof DashboardRecord) {
  const map = new Map<string, { name: string; count: number; amount: number; paid: number }>();
  for (const row of records) {
    const name = text(row[key]);
    const current = map.get(name) || { name, count: 0, amount: 0, paid: 0 };
    current.count += 1;
    current.amount += row.refund_amount;
    current.paid += row.actual_paid_amount;
    map.set(name, current);
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.count - a.count);
}

router.get("/metrics", async (_req, res) => {
  try {
    const records = await loadRecords();
    const total = records.reduce((acc, row) => acc + row.refund_amount, 0);
    const paid = records.reduce((acc, row) => acc + row.actual_paid_amount, 0);
    const ready = records.filter((row) => row.confirmation_cc && row.confirmation_power && row.refund_amount > 0 && statusKind(row.status) === "pendiente");
    const blockedPower = records.filter((row) => !row.confirmation_power);
    const blockedCc = records.filter((row) => !row.confirmation_cc);
    const dormant = records.filter((row) => daysSince(row.last_activity_at || row.updated_at || row.created_at) > 30 && statusKind(row.status) !== "cerrado");

    res.json({
      total,
      paid,
      count: records.length,
      ready: { count: ready.length, amount: ready.reduce((acc, row) => acc + row.refund_amount, 0) },
      blockers: {
        power: blockedPower.length,
        cc: blockedCc.length,
        dormant: dormant.length,
      },
      byEstado: groupBy(records, "status").map((item) => ({ estado: item.name, monto: item.amount, count: item.count })),
      byEntidad: groupBy(records, "entity").map((item) => ({ entidad: item.name, monto: item.amount, count: item.count })),
      byMandante: groupBy(records, "mandante").map((item) => ({ mandante: item.name, monto: item.amount, count: item.count })),
      byTipo: groupBy(records, "management_type").map((item) => ({ tipo: item.name, monto: item.amount, count: item.count })),
      insights: [
        `Hay ${ready.length} casos listos para gestionar.`,
        `Bloqueos principales: ${blockedPower.length} sin poder, ${blockedCc.length} sin CC y ${dormant.length} con más de 30 días sin actividad.`,
        groupBy(records, "entity")[0] ? `${groupBy(records, "entity")[0].name} concentra el mayor monto.` : "Sin entidad dominante.",
      ],
    });
  } catch (error: any) {
    console.error("ERROR /api/dashboard/metrics:", error?.message || error);
    res.status(500).json({ error: "Error generando métricas del dashboard", detail: String(error?.message || error) });
  }
});

export default router;
