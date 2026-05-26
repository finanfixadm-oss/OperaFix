import express from "express";
import { PrismaClient } from "@prisma/client";
import { filterRowsBySession } from "../middleware/security.js";

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
  client_amount: number;
  finanfix_amount: number;
  actual_client_amount: number;
  actual_finanfix_amount: number;
  fee: number;
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
    client_amount: moneyNumber(row.client_amount ?? row.monto_cliente),
    finanfix_amount: moneyNumber(row.finanfix_amount ?? row.monto_finanfix_solutions),
    actual_client_amount: moneyNumber(row.actual_client_amount ?? row.monto_real_cliente ?? row.client_amount ?? row.monto_cliente),
    actual_finanfix_amount: moneyNumber(row.actual_finanfix_amount ?? row.monto_real_finanfix_solutions ?? row.finanfix_amount ?? row.monto_finanfix_solutions),
    fee: moneyNumber(row.fee),
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


type DashboardFieldDefinition = {
  field: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  money?: boolean;
  sourceTable?: "lm_records" | "tp_records" | "computed" | "normalized";
  sourceColumn?: string;
  groupable?: boolean;
  measurable?: boolean;
};

const DASHBOARD_FIELDS: DashboardFieldDefinition[] = [
  { field: "mandante.name", label: "Mandante", type: "text", sourceTable: "normalized", sourceColumn: "mandante", groupable: true },
  { field: "management_type", label: "Tipo de gestión", type: "select", sourceTable: "normalized", sourceColumn: "management_type", groupable: true },
  { field: "mes_produccion_2026", label: "Mes de producción", type: "text", sourceTable: "lm_records", sourceColumn: "production_months", groupable: true },
  { field: "mes_ingreso_solicitud", label: "Mes ingreso solicitud", type: "text", sourceTable: "lm_records", sourceColumn: "request_entry_month", groupable: true },
  { field: "acceso_portal", label: "Acceso portal", type: "text", sourceTable: "lm_records", sourceColumn: "portal_access", groupable: true },
  { field: "envio_afp", label: "Envío AFP", type: "text", sourceTable: "lm_records", sourceColumn: "afp_shipment", groupable: true },
  { field: "estado_contrato_cliente", label: "Estado contrato cliente", type: "text", sourceTable: "lm_records", sourceColumn: "client_contract_status", groupable: true },
  { field: "estado_gestion", label: "Estado Gestión", type: "text", sourceTable: "lm_records", sourceColumn: "management_status", groupable: true },
  { field: "numero_solicitud", label: "N° Solicitud", type: "text", sourceTable: "lm_records", sourceColumn: "request_number", groupable: true },
  { field: "motivo_rechazo", label: "Motivo rechazo/anulación", type: "text", sourceTable: "lm_records", sourceColumn: "rejection_reason", groupable: true },
  { field: "fecha_rechazo", label: "Fecha rechazo", type: "date", sourceTable: "lm_records", sourceColumn: "rejection_date", groupable: true },
  { field: "grupo_empresa", label: "Grupo empresa", type: "text", sourceTable: "lm_records", sourceColumn: "search_group", groupable: true },
  { field: "owner_name", label: "Propietario", type: "text", sourceTable: "lm_records", sourceColumn: "owner_name", groupable: true },
  { field: "razon_social", label: "Razón Social", type: "text", sourceTable: "lm_records", sourceColumn: "business_name", groupable: true },
  { field: "rut", label: "RUT", type: "text", sourceTable: "lm_records", sourceColumn: "rut", groupable: true },
  { field: "direccion", label: "Dirección", type: "text", sourceTable: "lm_records", sourceColumn: "direccion", groupable: true },
  { field: "entidad", label: "Entidad / AFP", type: "text", sourceTable: "lm_records", sourceColumn: "entity", groupable: true },
  { field: "banco", label: "Banco", type: "text", sourceTable: "lm_records", sourceColumn: "bank_name", groupable: true },
  { field: "tipo_cuenta", label: "Tipo de Cuenta", type: "text", sourceTable: "lm_records", sourceColumn: "account_type", groupable: true },
  { field: "numero_cuenta", label: "Número cuenta", type: "text", sourceTable: "lm_records", sourceColumn: "account_number", groupable: true },
  { field: "confirmacion_cc", label: "Confirmación CC", type: "boolean", sourceTable: "lm_records", sourceColumn: "confirmation_cc", groupable: true },
  { field: "confirmacion_poder", label: "Confirmación Poder", type: "boolean", sourceTable: "lm_records", sourceColumn: "confirmation_power", groupable: true },
  { field: "consulta_cen", label: "Consulta CEN", type: "text", sourceTable: "lm_records", sourceColumn: "cen_query", groupable: true },
  { field: "contenido_cen", label: "Contenido CEN", type: "text", sourceTable: "lm_records", sourceColumn: "cen_content", groupable: true },
  { field: "respuesta_cen", label: "Respuesta CEN", type: "text", sourceTable: "lm_records", sourceColumn: "cen_response", groupable: true },
  { field: "estado_trabajador", label: "Estado Trabajador", type: "text", sourceTable: "lm_records", sourceColumn: "worker_status", groupable: true },
  { field: "motivo_tipo_exceso", label: "Motivo Tipo de exceso", type: "text", sourceTable: "lm_records", sourceColumn: "excess_type_reason", groupable: true },
  { field: "monto_devolucion", label: "Monto Devolución", type: "number", money: true, sourceTable: "lm_records", sourceColumn: "refund_amount", measurable: true },
  { field: "monto_pagado", label: "Monto Real Pagado", type: "number", money: true, sourceTable: "lm_records", sourceColumn: "actual_paid_amount", measurable: true },
  { field: "monto_cliente", label: "Monto cliente", type: "number", money: true, sourceTable: "lm_records", sourceColumn: "client_amount", measurable: true },
  { field: "monto_finanfix_solutions", label: "Monto Finanfix", type: "number", money: true, sourceTable: "lm_records", sourceColumn: "finanfix_amount", measurable: true },
  { field: "monto_real_cliente", label: "Monto real cliente", type: "number", money: true, sourceTable: "lm_records", sourceColumn: "actual_client_amount", measurable: true },
  { field: "monto_real_finanfix_solutions", label: "Monto real Finanfix Solutions", type: "number", money: true, sourceTable: "lm_records", sourceColumn: "actual_finanfix_amount", measurable: true },
  { field: "fee", label: "FEE", type: "number", money: true, sourceTable: "lm_records", sourceColumn: "fee", measurable: true },
  { field: "facturado_cliente", label: "Facturado cliente", type: "text", sourceTable: "lm_records", sourceColumn: "facturado_cliente", groupable: true },
  { field: "facturado_finanfix", label: "Facturado Finanfix", type: "text", sourceTable: "lm_records", sourceColumn: "facturado_finanfix", groupable: true },
  { field: "fecha_pago_afp", label: "Fecha Pago AFP", type: "date", sourceTable: "lm_records", sourceColumn: "afp_payment_date", groupable: true },
  { field: "fecha_factura_finanfix", label: "Fecha Factura Finanfix", type: "date", sourceTable: "lm_records", sourceColumn: "finanfix_invoice_date", groupable: true },
  { field: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date", sourceTable: "lm_records", sourceColumn: "finanfix_invoice_payment_date", groupable: true },
  { field: "fecha_notificacion_cliente", label: "Fecha notificación cliente", type: "date", sourceTable: "lm_records", sourceColumn: "client_notification_date", groupable: true },
  { field: "fecha_presentacion_afp", label: "Fecha Presentación AFP", type: "date", sourceTable: "lm_records", sourceColumn: "afp_submission_date", groupable: true },
  { field: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date", sourceTable: "lm_records", sourceColumn: "afp_entry_date", groupable: true },
  { field: "numero_factura", label: "N° Factura", type: "text", sourceTable: "lm_records", sourceColumn: "invoice_number", groupable: true },
  { field: "numero_oc", label: "N° OC", type: "text", sourceTable: "lm_records", sourceColumn: "oc_number", groupable: true },
  { field: "comment", label: "Comentario", type: "text", sourceTable: "lm_records", sourceColumn: "comment", groupable: true },
  { field: "documents", label: "Cantidad documentos", type: "number", sourceTable: "computed", sourceColumn: "documents_count", measurable: true },
  { field: "created_at", label: "Fecha creación", type: "date", sourceTable: "lm_records", sourceColumn: "created_at", groupable: true },
  { field: "updated_at", label: "Fecha actualización", type: "date", sourceTable: "lm_records", sourceColumn: "updated_at", groupable: true },
  { field: "last_activity_at", label: "Última actividad", type: "date", sourceTable: "lm_records", sourceColumn: "last_activity_at", groupable: true },
];

router.get("/fields", (_req, res) => {
  res.json(DASHBOARD_FIELDS);
});


router.get("/metrics", async (req, res) => {
  try {
    const records = filterRowsBySession(await loadRecords(), req as any);
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
