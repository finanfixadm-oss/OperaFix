import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

type MetricRow = Record<string, any>;

type NormalizedDashboardRecord = {
  id: string;
  management_type: "LM" | "TP";
  mandante: string;
  mandante_id: string | null;
  business_name: string;
  rut: string;
  entity: string;
  management_status: string;
  request_number: string;
  search_group: string;
  refund_amount: number;
  actual_paid_amount: number;
  client_amount: number;
  finanfix_amount: number;
  actual_client_amount: number;
  actual_finanfix_amount: number;
  fee: number;
  confirmation_cc: boolean;
  confirmation_power: boolean;
  created_at: string | null;
  updated_at: string | null;
  last_activity_at: string | null;
};

function text(value: unknown, fallback = "Sin información") {
  const out = String(value ?? "").trim();
  return out || fallback;
}

function number(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "si" || raw === "sí";
}

function normalizeRecord(row: MetricRow, type: "LM" | "TP"): NormalizedDashboardRecord {
  return {
    id: String(row.management_id || row.id || ""),
    management_type: type,
    mandante: text(row.mandante || row.mandante_name || row.client_name, "Sin mandante"),
    mandante_id: row.mandante_id || null,
    business_name: text(row.business_name || row.razon_social || row.company_name, "Sin empresa"),
    rut: text(row.rut || row.company_rut, "Sin RUT"),
    entity: text(row.entity || row.entidad || row.afp_name, "Sin entidad"),
    management_status: text(row.management_status || row.estado_gestion, "Sin estado"),
    request_number: text(row.request_number || row.numero_solicitud, ""),
    search_group: text(row.search_group || row.grupo_empresa, ""),
    refund_amount: number(row.refund_amount ?? row.monto_devolucion),
    actual_paid_amount: number(row.actual_paid_amount ?? row.monto_pagado),
    client_amount: number(row.client_amount ?? row.monto_cliente),
    finanfix_amount: number(row.finanfix_amount ?? row.monto_finanfix_solutions),
    actual_client_amount: number(row.actual_client_amount ?? row.monto_real_cliente),
    actual_finanfix_amount: number(row.actual_finanfix_amount ?? row.monto_real_finanfix_solutions),
    fee: number(row.fee),
    confirmation_cc: bool(row.confirmation_cc ?? row.confirmacion_cc),
    confirmation_power: bool(row.confirmation_power ?? row.confirmacion_poder),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_activity_at: row.last_activity_at || null,
  };
}

async function loadRecords() {
  const [lmRows, tpRows] = await Promise.all([
    prisma.$queryRawUnsafe<MetricRow[]>(`
      SELECT *
      FROM lm_records
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5000
    `),
    prisma.$queryRawUnsafe<MetricRow[]>(`
      SELECT *
      FROM tp_records
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5000
    `),
  ]);

  return [
    ...lmRows.map((row) => normalizeRecord(row, "LM")),
    ...tpRows.map((row) => normalizeRecord(row, "TP")),
  ];
}

function groupBy(rows: NormalizedDashboardRecord[], getter: (row: NormalizedDashboardRecord) => string) {
  const map = new Map<string, { name: string; count: number; amount: number; finanfix: number; paid: number }>();

  for (const row of rows) {
    const name = getter(row) || "Sin información";
    const current = map.get(name) || { name, count: 0, amount: 0, finanfix: 0, paid: 0 };
    current.count += 1;
    current.amount += row.refund_amount;
    current.finanfix += row.actual_finanfix_amount || row.finanfix_amount;
    current.paid += row.actual_paid_amount;
    map.set(name, current);
  }

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.count - a.count);
}

function daysSince(value: unknown) {
  if (!value) return 9999;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 9999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function agingBucket(row: NormalizedDashboardRecord) {
  const days = daysSince(row.last_activity_at || row.updated_at || row.created_at);
  if (days <= 7) return "0 a 7 días";
  if (days <= 15) return "8 a 15 días";
  if (days <= 30) return "16 a 30 días";
  if (days <= 60) return "31 a 60 días";
  return "+60 días";
}

function isPending(row: NormalizedDashboardRecord) {
  return /pendiente|preparacion|preparación|ingreso|enviado|present/i.test(row.management_status);
}

function isPaid(row: NormalizedDashboardRecord) {
  return /pagad|pago|factur|cerrad/i.test(row.management_status);
}

function isRejected(row: NormalizedDashboardRecord) {
  return /rechaz/i.test(row.management_status);
}

router.get("/metrics", async (_req, res) => {
  try {
    const records = await loadRecords();

    const total = records.reduce((acc, row) => acc + row.refund_amount, 0);
    const paid = records.filter(isPaid).reduce((acc, row) => acc + row.refund_amount, 0);
    const pending = records.filter(isPending).reduce((acc, row) => acc + row.refund_amount, 0);
    const rejected = records.filter(isRejected).reduce((acc, row) => acc + row.refund_amount, 0);
    const totalFinanfix = records.reduce((acc, row) => acc + (row.actual_finanfix_amount || row.finanfix_amount), 0);
    const readyToManage = records.filter((row) => isPending(row) && row.confirmation_cc && row.confirmation_power && row.refund_amount > 0).length;
    const blockedByPower = records.filter((row) => isPending(row) && !row.confirmation_power).length;
    const blockedByCc = records.filter((row) => isPending(row) && !row.confirmation_cc).length;

    const priority = [...records]
      .filter((row) => row.refund_amount > 0 && (isPending(row) || (!row.confirmation_cc || !row.confirmation_power)))
      .sort((a, b) => {
        const scoreA = a.refund_amount + (a.confirmation_cc ? 500000 : 0) + (a.confirmation_power ? 500000 : 0) - daysSince(a.updated_at) * 5000;
        const scoreB = b.refund_amount + (b.confirmation_cc ? 500000 : 0) + (b.confirmation_power ? 500000 : 0) - daysSince(b.updated_at) * 5000;
        return scoreB - scoreA;
      })
      .slice(0, 20);

    res.json({
      total,
      paid,
      pending,
      rejected,
      totalFinanfix,
      count: records.length,
      readyToManage,
      blockedByPower,
      blockedByCc,
      byEstado: groupBy(records, (row) => row.management_status).map(({ name, amount, count }) => ({ estado: name, monto: amount, count })),
      byEntidad: groupBy(records, (row) => row.entity).map(({ name, amount, count }) => ({ entidad: name, monto: amount, count })),
      byMandante: groupBy(records, (row) => row.mandante).map(({ name, amount, count }) => ({ mandante: name, monto: amount, count })),
      byTipo: groupBy(records, (row) => row.management_type).map(({ name, amount, count }) => ({ tipo: name, monto: amount, count })),
      aging: groupBy(records, agingBucket).map(({ name, amount, count }) => ({ bucket: name, monto: amount, count })),
      priority,
      aiInsights: [
        readyToManage > 0 ? `Hay ${readyToManage} casos listos para gestionar con CC y poder confirmados.` : "No hay casos listos con CC y poder confirmados.",
        blockedByPower > 0 ? `${blockedByPower} casos pendientes están bloqueados por falta de poder.` : "No hay bloqueos relevantes por poder.",
        blockedByCc > 0 ? `${blockedByCc} casos pendientes están bloqueados por falta de cuenta corriente.` : "No hay bloqueos relevantes por cuenta corriente.",
        `La cartera total visible suma ${records.length} registros y $${Math.round(total).toLocaleString("es-CL")} en devolución.`,
      ],
    });
  } catch (error: any) {
    console.error("ERROR /api/dashboard/metrics:", error?.message || error);
    res.status(500).json({
      error: "Error generando métricas del dashboard",
      detail: String(error?.message || error),
    });
  }
});

export default router;
