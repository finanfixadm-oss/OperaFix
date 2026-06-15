import { Router } from "express";
import jwt from "jsonwebtoken";
import * as XLSX from "xlsx";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { audit, filterRowsBySession } from "../middleware/security.js";

const reportsRouter = Router();

type ReportField = {
  key: string;
  label: string;
  type: "text" | "money" | "boolean" | "date";
};

const reportFields: ReportField[] = [
  { key: "mandante", label: "Mandante", type: "text" },
  { key: "management_type", label: "Tipo gestión", type: "text" },
  { key: "estado_contrato_cliente", label: "Estado contrato con cliente", type: "text" },
  { key: "fecha_termino_contrato", label: "Fecha término de contrato", type: "date" },
  { key: "motivo_tipo_exceso", label: "Motivo (Tipo de exceso)", type: "text" },
  { key: "entidad", label: "Entidad", type: "text" },
  { key: "envio_afp", label: "Envío AFP", type: "text" },
  { key: "estado_gestion", label: "Estado Gestión", type: "text" },
  { key: "fecha_presentacion_afp", label: "Fecha Presentación AFP", type: "date" },
  { key: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date" },
  { key: "fecha_pago_afp", label: "Fecha Pago AFP", type: "date" },
  { key: "numero_solicitud", label: "N° Solicitud", type: "text" },
  { key: "grupo_empresa", label: "Holding", type: "text" },
  { key: "razon_social", label: "Razón Social", type: "text" },
  { key: "rut", label: "RUT", type: "text" },
  { key: "monto_devolucion", label: "Monto estimado", type: "money" },
  { key: "monto_cliente", label: "Monto estimado cliente", type: "money" },
  { key: "monto_pagado", label: "Monto Real Pagado", type: "money" },
  { key: "monto_real_cliente", label: "Monto real cliente", type: "money" },
  { key: "fee", label: "FEE", type: "money" },
  { key: "monto_real_finanfix_solutions", label: "Monto real Finanfix Solutions", type: "money" },
  { key: "banco", label: "Banco", type: "text" },
  { key: "tipo_cuenta", label: "Tipo de Cuenta", type: "text" },
  { key: "numero_cuenta", label: "Número cuenta", type: "text" },
  { key: "confirmacion_cc", label: "Confirmación CC", type: "boolean" },
  { key: "confirmacion_poder", label: "Confirmación Poder Notarial", type: "boolean" },
  { key: "acceso_portal", label: "Acceso portal", type: "text" },
  { key: "porcentaje_liquidaciones", label: "Porcentaje de liquidaciones", type: "text" },
  { key: "facturado_finanfix", label: "Facturado Finanfix", type: "text" },
  { key: "facturado_cliente", label: "Facturado cliente", type: "text" },
  { key: "fecha_factura_finanfix", label: "Fecha Factura Finanfix", type: "date" },
  { key: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date" },
  { key: "numero_factura", label: "N° Factura", type: "text" },
  { key: "numero_oc", label: "N° OC", type: "text" },
  { key: "fecha_rechazo", label: "Fecha Rechazo", type: "date" },
  { key: "motivo_rechazo", label: "Motivo del rechazo", type: "text" },
  { key: "consulta_cen", label: "Consulta CEN", type: "text" },
  { key: "contenido_cen", label: "Contenido CEN", type: "text" },
  { key: "respuesta_cen", label: "Respuesta CEN", type: "text" },
  { key: "estado_trabajador", label: "Estado Trabajador", type: "text" },
  { key: "comment", label: "Comentario", type: "text" },
  { key: "mes_ingreso_solicitud", label: "Mes de ingreso solicitud", type: "text" },
  { key: "mes_produccion_2026", label: "Mes de producción 2026", type: "text" },
  { key: "created_at", label: "Hora de creación", type: "date" },
  { key: "updated_at", label: "Hora de modificación", type: "date" },
  { key: "last_activity_at", label: "Hora de la última actividad", type: "date" },
];

const fieldByKey = new Map(reportFields.map((field) => [field.key, field]));

type TableColumnMap = Record<string, Set<string>>;

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try { return jwt.verify(token, env.jwtSecret) as any; } catch { return null; }
}

function isInternal(session: any) {
  const role = String(session?.role || "").toLowerCase();
  return ["admin", "interno", "kam_admin", "kam"].includes(role);
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

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = current_schema()
        and table_name = $1
    ) as exists`,
    tableName
  );
  return Boolean(rows[0]?.exists);
}

async function getColumns(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `select column_name
     from information_schema.columns
     where table_schema = current_schema()
       and table_name = $1`,
    tableName
  );
  return new Set<string>(rows.map((row: { column_name: string }) => row.column_name));
}

function expr(columns: Set<string>, column: string, alias = column, fallback = "null") {
  return columns.has(column)
    ? `r.${quoteIdent(column)} as ${quoteIdent(alias)}`
    : `${fallback} as ${quoteIdent(alias)}`;
}

function relationExpr(
  tableColumns: TableColumnMap,
  relationAlias: "m" | "c" | "a",
  relationTable: string,
  column: string,
  alias: string,
  fallback = "null"
) {
  return tableColumns[relationTable]?.has(column)
    ? `${relationAlias}.${quoteIdent(column)} as ${quoteIdent(alias)}`
    : `${fallback} as ${quoteIdent(alias)}`;
}

async function loadRecordTable(tableName: "lm_records" | "tp_records", type: "LM" | "TP") {
  if (!(await tableExists(tableName))) return [] as any[];

  const tableColumns: TableColumnMap = {};
  tableColumns[tableName] = await getColumns(tableName);

  const hasMandantes = await tableExists("mandantes");
  const hasCompanies = await tableExists("companies");
  const hasLineAfps = await tableExists("management_line_afps");
  if (hasMandantes) tableColumns.mandantes = await getColumns("mandantes");
  if (hasCompanies) tableColumns.companies = await getColumns("companies");
  if (hasLineAfps) tableColumns.management_line_afps = await getColumns("management_line_afps");

  const cols = tableColumns[tableName];
  const joins: string[] = [];
  if (hasMandantes && cols.has("mandante_id") && tableColumns.mandantes?.has("id")) {
    joins.push(`left join mandantes m on m.id = r.mandante_id`);
  }
  if (hasCompanies && cols.has("company_id") && tableColumns.companies?.has("id")) {
    joins.push(`left join companies c on c.id = r.company_id`);
  }
  if (hasLineAfps && cols.has("line_afp_id") && tableColumns.management_line_afps?.has("id")) {
    joins.push(`left join management_line_afps a on a.id = r.line_afp_id`);
  }

  const select = [
    `'${type}'::text as "management_type"`,
    expr(cols, "id"),
    expr(cols, "management_id"),
    expr(cols, "mandante_id"),
    expr(cols, "mandante"),
    relationExpr(tableColumns, "m", "mandantes", "name", "mandante_rel_name"),
    expr(cols, "company_id"),
    relationExpr(tableColumns, "c", "companies", "razon_social", "company_razon_social"),
    relationExpr(tableColumns, "c", "companies", "rut", "company_rut"),
    relationExpr(tableColumns, "a", "management_line_afps", "afp_name", "line_afp_name"),
    expr(cols, "search_group"),
    expr(cols, "business_name"),
    expr(cols, "rut"),
    expr(cols, "entity"),
    expr(cols, "management_status"),
    expr(cols, "refund_amount"),
    expr(cols, "actual_paid_amount"),
    expr(cols, "monto_cliente"),
    expr(cols, "monto_finanfix_solutions"),
    expr(cols, "monto_real_cliente"),
    expr(cols, "monto_real_finanfix_solutions"),
    expr(cols, "fee"),
    expr(cols, "request_number"),
    expr(cols, "numero_factura"),
    expr(cols, "invoice_number"),
    expr(cols, "numero_oc"),
    expr(cols, "oc_number"),
    expr(cols, "bank_name"),
    expr(cols, "account_type"),
    expr(cols, "account_number"),
    expr(cols, "confirmation_cc"),
    expr(cols, "confirmation_power"),
    expr(cols, "portal_access"),
    expr(cols, "acceso_portal"),
    expr(cols, "porcentaje_liquidaciones"),
    expr(cols, "worker_status"),
    expr(cols, "motivo_tipo_exceso"),
    expr(cols, "excess_type_reason"),
    expr(cols, "estado_contrato_cliente"),
    expr(cols, "fecha_termino_contrato"),
    expr(cols, "mes_ingreso_solicitud"),
    expr(cols, "mes_produccion_2026"),
    expr(cols, "envio_afp"),
    expr(cols, "motivo_rechazo"),
    expr(cols, "consulta_cen"),
    expr(cols, "contenido_cen"),
    expr(cols, "respuesta_cen"),
    expr(cols, "facturado_cliente"),
    expr(cols, "facturado_finanfix"),
    expr(cols, "fecha_presentacion_afp"),
    expr(cols, "fecha_ingreso_afp"),
    expr(cols, "fecha_pago_afp"),
    expr(cols, "fecha_factura_finanfix"),
    expr(cols, "fecha_pago_factura_finanfix"),
    expr(cols, "fecha_rechazo"),
    expr(cols, "comment"),
    expr(cols, "created_at"),
    expr(cols, "updated_at"),
    expr(cols, "last_activity_at"),
  ];

  const orderColumn = cols.has("created_at") ? "created_at" : cols.has("updated_at") ? "updated_at" : "id";
  const sql = `
    select ${select.join(",\n           ")}
    from ${quoteIdent(tableName)} r
    ${joins.join("\n")}
    order by r.${quoteIdent(orderColumn)} desc nulls last
    limit 10000
  `;
  return prisma.$queryRawUnsafe<any[]>(sql);
}

function normalizeRow(row: any) {
  return {
    id: row.management_id || row.id,
    source_id: row.id,
    management_type: row.management_type || "",
    mandante_id: row.mandante_id || null,
    mandante: row.mandante_rel_name || row.mandante || "Sin mandante",
    grupo_empresa: row.search_group || "",
    razon_social: row.business_name || row.company_razon_social || "",
    rut: row.rut || row.company_rut || "",
    entidad: row.entity || row.line_afp_name || "",
    estado_gestion: row.management_status || "",
    monto_devolucion: normalizeDecimal(row.refund_amount),
    monto_pagado: normalizeDecimal(row.actual_paid_amount),
    monto_cliente: normalizeDecimal(row.monto_cliente),
    monto_finanfix_solutions: normalizeDecimal(row.monto_finanfix_solutions),
    monto_real_cliente: normalizeDecimal(row.monto_real_cliente),
    monto_real_finanfix_solutions: normalizeDecimal(row.monto_real_finanfix_solutions),
    fee: normalizeDecimal(row.fee),
    numero_solicitud: row.request_number || "",
    numero_factura: row.numero_factura || row.invoice_number || "",
    numero_oc: row.numero_oc || row.oc_number || "",
    banco: row.bank_name || "",
    tipo_cuenta: row.account_type || "",
    numero_cuenta: row.account_number || "",
    confirmacion_cc: Boolean(row.confirmation_cc),
    confirmacion_poder: Boolean(row.confirmation_power),
    acceso_portal: row.portal_access || row.acceso_portal || "",
    porcentaje_liquidaciones: row.porcentaje_liquidaciones || "",
    estado_trabajador: row.worker_status || "",
    motivo_tipo_exceso: row.motivo_tipo_exceso || row.excess_type_reason || (row.management_type === "TP" ? "Trabajo Pesado (TP)" : ""),
    estado_contrato_cliente: row.estado_contrato_cliente || "",
    fecha_termino_contrato: iso(row.fecha_termino_contrato),
    mes_ingreso_solicitud: row.mes_ingreso_solicitud || "",
    mes_produccion_2026: row.mes_produccion_2026 || "",
    envio_afp: row.envio_afp || "",
    motivo_rechazo: row.motivo_rechazo || "",
    consulta_cen: row.consulta_cen || "",
    contenido_cen: row.contenido_cen || "",
    respuesta_cen: row.respuesta_cen || "",
    facturado_cliente: row.facturado_cliente || "",
    facturado_finanfix: row.facturado_finanfix || "",
    fecha_presentacion_afp: iso(row.fecha_presentacion_afp),
    fecha_ingreso_afp: iso(row.fecha_ingreso_afp),
    fecha_pago_afp: iso(row.fecha_pago_afp),
    fecha_factura_finanfix: iso(row.fecha_factura_finanfix),
    fecha_pago_factura_finanfix: iso(row.fecha_pago_factura_finanfix),
    fecha_rechazo: iso(row.fecha_rechazo),
    comment: row.comment || "",
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    last_activity_at: iso(row.last_activity_at),
  };
}

async function loadRows(session: any) {
  const [lm, tp] = await Promise.all([
    loadRecordTable("lm_records", "LM"),
    loadRecordTable("tp_records", "TP"),
  ]);
  return filterRowsBySession([...lm, ...tp].map(normalizeRow) as any[], session as any);
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
