import { Router } from "express";
import jwt from "jsonwebtoken";
import * as XLSX from "xlsx";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { audit } from "../middleware/security.js";

const reportsRouter = Router();

type ReportField = {
  key: string;
  label: string;
  type: "text" | "money" | "boolean" | "date";
};

const reportFields: ReportField[] = [
  { key: "mandante", label: "Mandante", type: "text" },
  { key: "management_type", label: "Tipo gestión", type: "text" },
  { key: "grupo_empresa", label: "Grupo empresa", type: "text" },
  { key: "razon_social", label: "Razón Social", type: "text" },
  { key: "rut", label: "RUT", type: "text" },
  { key: "entidad", label: "Entidad / AFP", type: "text" },
  { key: "estado_gestion", label: "Estado Gestión", type: "text" },
  { key: "monto_devolucion", label: "Monto Devolución", type: "money" },
  { key: "monto_pagado", label: "Monto Real Pagado", type: "money" },
  { key: "monto_cliente", label: "Monto cliente", type: "money" },
  { key: "monto_finanfix_solutions", label: "Monto Finanfix", type: "money" },
  { key: "numero_solicitud", label: "N° Solicitud", type: "text" },
  { key: "numero_factura", label: "N° Factura", type: "text" },
  { key: "numero_oc", label: "N° OC", type: "text" },
  { key: "banco", label: "Banco", type: "text" },
  { key: "tipo_cuenta", label: "Tipo de Cuenta", type: "text" },
  { key: "numero_cuenta", label: "Número cuenta", type: "text" },
  { key: "confirmacion_cc", label: "Confirmación CC", type: "boolean" },
  { key: "confirmacion_poder", label: "Confirmación Poder", type: "boolean" },
  { key: "acceso_portal", label: "Acceso portal", type: "text" },
  { key: "estado_trabajador", label: "Estado Trabajador", type: "text" },
  { key: "motivo_tipo_exceso", label: "Motivo (Tipo de exceso)", type: "text" },
  { key: "motivo_rechazo", label: "Motivo rechazo/anulación", type: "text" },
  { key: "consulta_cen", label: "Consulta CEN", type: "text" },
  { key: "respuesta_cen", label: "Respuesta CEN", type: "text" },
  { key: "facturado_cliente", label: "Facturado cliente", type: "text" },
  { key: "facturado_finanfix", label: "Facturado Finanfix", type: "text" },
  { key: "fecha_presentacion_afp", label: "Fecha Presentación AFP", type: "date" },
  { key: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date" },
  { key: "fecha_pago_afp", label: "Fecha Pago AFP", type: "date" },
  { key: "fecha_factura_finanfix", label: "Fecha Factura Finanfix", type: "date" },
  { key: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date" },
  { key: "fecha_rechazo", label: "Fecha Rechazo", type: "date" },
  { key: "created_at", label: "Hora de creación", type: "date" },
  { key: "updated_at", label: "Hora de modificación", type: "date" },
  { key: "last_activity_at", label: "Hora de la última actividad", type: "date" },
];

const fieldByKey = new Map(reportFields.map((field) => [field.key, field]));

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try { return jwt.verify(token, env.jwtSecret) as any; } catch { return null; }
}

function isInternal(session: any) {
  const role = String(session?.role || "").toLowerCase();
  return ["admin", "interno", "kam"].includes(role);
}

function normalizeDecimal(value: any) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "object" && typeof value.toNumber === "function") return value.toNumber();
  return Number(value || 0);
}

function iso(value: any) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeLm(row: any) {
  return {
    id: row.management_id || row.id,
    source_id: row.id,
    management_type: "LM",
    mandante_id: row.mandante_id || null,
    mandante: row.mandante_rel?.name || row.mandante || "Sin mandante",
    grupo_empresa: row.search_group || "",
    razon_social: row.business_name || row.company_rel?.razon_social || "",
    rut: row.rut || row.company_rel?.rut || "",
    entidad: row.entity || row.line_afp_rel?.afp_name || "",
    estado_gestion: row.management_status || "",
    monto_devolucion: normalizeDecimal(row.refund_amount),
    monto_pagado: normalizeDecimal(row.actual_paid_amount),
    monto_cliente: normalizeDecimal(row.monto_cliente),
    monto_finanfix_solutions: normalizeDecimal(row.monto_finanfix_solutions),
    numero_solicitud: row.request_number || "",
    numero_factura: row.numero_factura || row.invoice_number || "",
    numero_oc: row.numero_oc || row.oc_number || "",
    banco: row.bank_name || "",
    tipo_cuenta: row.account_type || "",
    numero_cuenta: row.account_number || "",
    confirmacion_cc: Boolean(row.confirmation_cc),
    confirmacion_poder: Boolean(row.confirmation_power),
    acceso_portal: row.portal_access || "",
    estado_trabajador: row.worker_status || "",
    motivo_tipo_exceso: row.motivo_tipo_exceso || row.excess_type_reason || "",
    motivo_rechazo: row.motivo_rechazo || "",
    consulta_cen: row.consulta_cen || "",
    respuesta_cen: row.respuesta_cen || "",
    facturado_cliente: row.facturado_cliente || "",
    facturado_finanfix: row.facturado_finanfix || "",
    fecha_presentacion_afp: iso(row.fecha_presentacion_afp),
    fecha_ingreso_afp: iso(row.fecha_ingreso_afp),
    fecha_pago_afp: iso(row.fecha_pago_afp),
    fecha_factura_finanfix: iso(row.fecha_factura_finanfix),
    fecha_pago_factura_finanfix: iso(row.fecha_pago_factura_finanfix),
    fecha_rechazo: iso(row.fecha_rechazo),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    last_activity_at: iso(row.last_activity_at),
  };
}

function normalizeTp(row: any) {
  return {
    id: row.management_id || row.id,
    source_id: row.id,
    management_type: "TP",
    mandante_id: row.mandante_id || null,
    mandante: row.mandante_rel?.name || row.mandante || "Sin mandante",
    grupo_empresa: row.search_group || "",
    razon_social: row.business_name || row.company_rel?.razon_social || "",
    rut: row.rut || row.company_rel?.rut || "",
    entidad: row.entity || row.line_afp_rel?.afp_name || "",
    estado_gestion: row.management_status || "",
    monto_devolucion: normalizeDecimal(row.refund_amount),
    monto_pagado: normalizeDecimal(row.actual_paid_amount),
    monto_cliente: 0,
    monto_finanfix_solutions: 0,
    numero_solicitud: row.request_number || "",
    numero_factura: "",
    numero_oc: "",
    banco: row.bank_name || "",
    tipo_cuenta: row.account_type || "",
    numero_cuenta: row.account_number || "",
    confirmacion_cc: false,
    confirmacion_poder: false,
    acceso_portal: row.portal_access || row.acceso_portal || "",
    estado_trabajador: row.worker_status || "",
    motivo_tipo_exceso: "Trabajo Pesado TP",
    motivo_rechazo: "",
    consulta_cen: row.consulta_cen || "",
    respuesta_cen: row.respuesta_cen || "",
    facturado_cliente: "",
    facturado_finanfix: "",
    fecha_presentacion_afp: null,
    fecha_ingreso_afp: null,
    fecha_pago_afp: null,
    fecha_factura_finanfix: null,
    fecha_pago_factura_finanfix: null,
    fecha_rechazo: null,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    last_activity_at: iso(row.last_activity_at),
  };
}

async function loadRows(session: any) {
  const lmWhere: any = {};
  const tpWhere: any = {};
  if (session && !isInternal(session)) {
    if (session.mandante_id) {
      lmWhere.OR = [{ mandante_id: session.mandante_id }, { mandante: session.mandante_name || "" }];
      tpWhere.OR = [{ mandante_id: session.mandante_id }, { mandante: session.mandante_name || "" }];
    } else if (session.mandante_name) {
      lmWhere.mandante = session.mandante_name;
      tpWhere.mandante = session.mandante_name;
    } else {
      return [];
    }
  }
  const [lm, tp] = await Promise.all([
    prisma.lmRecord.findMany({ where: lmWhere, include: { mandante_rel: true, company_rel: true, line_afp_rel: true }, orderBy: { created_at: "desc" }, take: 10000 }),
    prisma.tpRecord.findMany({ where: tpWhere, include: { mandante_rel: true, company_rel: true, line_afp_rel: true }, orderBy: { created_at: "desc" }, take: 10000 }),
  ]);
  return [...lm.map(normalizeLm), ...tp.map(normalizeTp)];
}

type Filter = { field: string; operator: string; value: string; value2?: string };

function matchesFilter(row: any, filter: Filter) {
  const field = fieldByKey.get(filter.field);
  if (!field) return true;
  const value = row[filter.field];
  const filterValue = String(filter.value ?? "").trim().toLowerCase();
  const text = String(value ?? "").trim().toLowerCase();
  if (filter.operator === "not_empty") return text !== "" && text !== "null" && text !== "undefined";
  if (filter.operator === "empty") return text === "" || text === "null" || text === "undefined";
  if (filter.operator === "equals") return text === filterValue;
  if (filter.operator === "not_equals") return text !== filterValue;
  if (filter.operator === "contains") return text.includes(filterValue);
  if (filter.operator === "in") return filterValue.split(/[;,|]/).map((x) => x.trim()).filter(Boolean).includes(text);
  if (field.type === "money") {
    const n = Number(value || 0);
    const v = Number(String(filter.value || "0").replace(/[^0-9.-]/g, ""));
    const v2 = Number(String(filter.value2 || "0").replace(/[^0-9.-]/g, ""));
    if (filter.operator === "gt") return n > v;
    if (filter.operator === "gte") return n >= v;
    if (filter.operator === "lt") return n < v;
    if (filter.operator === "lte") return n <= v;
    if (filter.operator === "between") return n >= v && n <= v2;
  }
  if (field.type === "date") {
    const d = value ? new Date(value).getTime() : 0;
    const v = filter.value ? new Date(filter.value).getTime() : 0;
    const v2 = filter.value2 ? new Date(filter.value2).getTime() : 0;
    if (!d) return false;
    if (filter.operator === "date_from") return d >= v;
    if (filter.operator === "date_to") return d <= v;
    if (filter.operator === "date_between") return d >= v && d <= v2;
  }
  if (field.type === "boolean") {
    const b = Boolean(value);
    const desired = ["si", "sí", "true", "1", "confirmado"].includes(filterValue);
    return b === desired;
  }
  return true;
}

function applyFilters(rows: any[], filters: Filter[] = [], pattern = "AND") {
  const active = filters.filter((f) => f.field && f.operator);
  if (!active.length) return rows;
  const useOr = String(pattern || "AND").toUpperCase().includes("OR") || String(pattern || "").toLowerCase().includes(" o ");
  return rows.filter((row) => useOr ? active.some((filter) => matchesFilter(row, filter)) : active.every((filter) => matchesFilter(row, filter)));
}

function safeColumns(columns: string[] = []) {
  const clean = columns.filter((key) => fieldByKey.has(key));
  return clean.length ? clean : ["mandante", "razon_social", "rut", "entidad", "estado_gestion", "monto_devolucion", "numero_solicitud"];
}

function projectRows(rows: any[], columns: string[]) {
  return rows.map((row) => {
    const out: any = {};
    for (const key of columns) {
      const field = fieldByKey.get(key)!;
      let value = row[key];
      if (field.type === "date" && value) value = new Date(value).toLocaleDateString("es-CL");
      if (field.type === "boolean") value = value ? "Sí" : "No";
      out[field.label] = value ?? "";
    }
    return out;
  });
}

reportsRouter.get("/fields", (_req, res) => {
  res.json({ fields: reportFields });
});

reportsRouter.post("/preview", async (req, res) => {
  try {
    const session = getSession(req);
    const allRows = await loadRows(session);
    const columns = safeColumns(req.body.columns || []);
    const filtered = applyFilters(allRows, req.body.filters || [], req.body.criteriaPattern || "AND");
    const limit = Math.max(1, Math.min(Number(req.body.limit || 100), 500));
    await audit(req as any, "preview", "report-builder", "Vista previa informe: " + filtered.length + " registros");
    res.json({
      totalRows: filtered.length,
      shownRows: Math.min(filtered.length, limit),
      columns: columns.map((key) => fieldByKey.get(key)),
      rows: projectRows(filtered.slice(0, limit), columns),
      restrictedByMandante: session && !isInternal(session) ? (session.mandante_name || session.mandante_id || true) : null,
    });
  } catch (error: any) {
    console.error("Report preview error:", error);
    res.status(500).json({ message: "No se pudo generar la vista previa del informe.", detail: error?.message });
  }
});

reportsRouter.post("/download", async (req, res) => {
  try {
    const session = getSession(req);
    const allRows = await loadRows(session);
    const columns = safeColumns(req.body.columns || []);
    const filtered = applyFilters(allRows, req.body.filters || [], req.body.criteriaPattern || "AND");
    const projected = projectRows(filtered, columns);
    const worksheet = XLSX.utils.json_to_sheet(projected);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informe");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = String(req.body.fileName || "informe_operafix.xlsx").replace(/[\\/:*?"<>|]+/g, "_");
    await audit(req as any, "download", "report-builder", "Descarga informe: " + filtered.length + " registros; columnas: " + columns.join(","));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error("Report download error:", error);
    res.status(500).json({ message: "No se pudo descargar el informe.", detail: error?.message });
  }
});

export default reportsRouter;
