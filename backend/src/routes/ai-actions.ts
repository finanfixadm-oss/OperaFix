import { Router } from "express";
import { prisma } from "../config/prisma.js";

const aiActionsRouter = Router();

type AiAction = {
  id?: string;
  type: "UPDATE_STATUS" | "ADD_NOTE" | "CREATE_TASK" | "MARK_CONFIRMATION" | "CREATE_EMAIL_DRAFT";
  recordId: string;
  label?: string;
  payload?: Record<string, any>;
};

const MANAGEMENT_FIELDS = [
  "id",
  "mandante_id",
  "group_id",
  "company_id",
  "line_id",
  "line_afp_id",
  "management_type",
  "owner_name",
  "estado_contrato_cliente",
  "fecha_termino_contrato",
  "motivo_tipo_exceso",
  "mes_produccion_2026",
  "mes_ingreso_solicitud",
  "entidad",
  "envio_afp",
  "estado_gestion",
  "fecha_presentacion_afp",
  "fecha_ingreso_afp",
  "fecha_pago_afp",
  "numero_solicitud",
  "grupo_empresa",
  "razon_social",
  "rut",
  "direccion",
  "monto_devolucion",
  "monto_pagado",
  "monto_cliente",
  "monto_finanfix_solutions",
  "monto_real_cliente",
  "monto_real_finanfix_solutions",
  "fee",
  "banco",
  "tipo_cuenta",
  "numero_cuenta",
  "confirmacion_cc",
  "confirmacion_poder",
  "acceso_portal",
  "facturado_finanfix",
  "facturado_cliente",
  "fecha_factura_finanfix",
  "fecha_pago_factura_finanfix",
  "fecha_notificacion_cliente",
  "numero_factura",
  "numero_oc",
  "fecha_rechazo",
  "motivo_rechazo",
  "consulta_cen",
  "contenido_cen",
  "respuesta_cen",
  "estado_trabajador",
  "comment",
  "created_at",
  "updated_at",
  "last_activity_at",
];

const LM_LEGACY_FIELDS = [
  "id",
  "management_id",
  "mandante_id",
  "company_id",
  "line_id",
  "line_afp_id",
  "mandante",
  "search_group",
  "rut",
  "entity",
  "management_status",
  "refund_amount",
  "confirmation_cc",
  "confirmation_power",
  "actual_paid_amount",
  "excess_type_reason",
  "worker_status",
  "request_number",
  "business_name",
  "bank_name",
  "account_number",
  "account_type",
  "comment",
  "portal_access",
  "estado_contrato_cliente",
  "fecha_termino_contrato",
  "motivo_tipo_exceso",
  "mes_produccion_2026",
  "envio_afp",
  "fecha_presentacion_afp",
  "fecha_ingreso_afp",
  "fecha_pago_afp",
  "monto_cliente",
  "fee",
  "monto_finanfix_solutions",
  "monto_real_cliente",
  "monto_real_finanfix_solutions",
  "facturado_finanfix",
  "facturado_cliente",
  "fecha_factura_finanfix",
  "fecha_pago_factura_finanfix",
  "fecha_notificacion_cliente",
  "numero_factura",
  "numero_oc",
  "fecha_rechazo",
  "motivo_rechazo",
  "consulta_cen",
  "contenido_cen",
  "respuesta_cen",
  "created_at",
  "updated_at",
  "last_activity_at",
];

const TP_LEGACY_FIELDS = [
  "id",
  "management_id",
  "mandante_id",
  "company_id",
  "line_id",
  "line_afp_id",
  "mandante",
  "rut",
  "entity",
  "business_name",
  "management_status",
  "refund_amount",
  "request_number",
  "search_group",
  "bank_name",
  "account_number",
  "account_type",
  "portal_access",
  "production_months",
  "mes_produccion_2026",
  "comment",
  "client_contract_status",
  "estado_contrato_cliente",
  "contract_end_date",
  "fecha_termino_contrato",
  "cen_content",
  "contenido_cen",
  "cen_query",
  "consulta_cen",
  "cen_response",
  "respuesta_cen",
  "created_at",
  "updated_at",
  "last_activity_at",
];

function money(value: unknown) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}


type ReportColumn = {
  key: string;
  label: string;
  type?: "text" | "money" | "date" | "boolean";
  aliases?: string[];
};

type AiReport = {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  filtersApplied: string[];
  generatedAt: string;
};

const REPORT_COLUMNS: ReportColumn[] = [
  { key: "mandante", label: "Mandante", aliases: ["cliente", "nombre cliente"] },
  { key: "razon_social", label: "Razón Social", aliases: ["empresa", "razon", "razón"] },
  { key: "rut", label: "RUT", aliases: ["rut empresa"] },
  { key: "entidad", label: "Entidad / AFP", aliases: ["afp", "institucion", "institución"] },
  { key: "estado_gestion", label: "Estado Gestión", aliases: ["estado", "gestion", "gestión"] },
  { key: "numero_solicitud", label: "N° Solicitud", aliases: ["solicitud", "ticket", "n solicitud"] },
  { key: "motivo_tipo_exceso", label: "Motivo / Tipo exceso", aliases: ["motivo", "tipo exceso", "tipo"] },
  { key: "grupo_empresa", label: "Buscar Grupo", aliases: ["grupo", "grupo empresa"] },
  { key: "mes_produccion_2026", label: "Mes producción", aliases: ["mes produccion", "mes producción"] },
  { key: "monto_devolucion", label: "Monto Devolución", type: "money", aliases: ["monto", "devolucion", "devolución"] },
  { key: "monto_cliente", label: "Monto cliente", type: "money", aliases: ["cliente monto"] },
  { key: "monto_finanfix_solutions", label: "Monto Finanfix", type: "money", aliases: ["finanfix", "monto finanfix"] },
  { key: "monto_real_cliente", label: "Monto real cliente", type: "money", aliases: ["real cliente"] },
  { key: "monto_real_finanfix_solutions", label: "Monto real Finanfix Solutions", type: "money", aliases: ["real finanfix", "monto real finanfix"] },
  { key: "monto_pagado", label: "Monto Real Pagado", type: "money", aliases: ["pagado", "monto pagado", "real pagado"] },
  { key: "confirmacion_cc", label: "Confirmación CC", type: "boolean", aliases: ["cc", "cuenta corriente"] },
  { key: "confirmacion_poder", label: "Confirmación Poder", type: "boolean", aliases: ["poder"] },
  { key: "banco", label: "Banco" },
  { key: "tipo_cuenta", label: "Tipo de Cuenta", aliases: ["tipo cuenta"] },
  { key: "numero_cuenta", label: "Número cuenta", aliases: ["cuenta", "numero cuenta", "número cuenta"] },
  { key: "facturado_cliente", label: "Facturado cliente", aliases: ["facturado cliente"] },
  { key: "facturado_finanfix", label: "Facturado Finanfix", aliases: ["facturado finanfix"] },
  { key: "numero_factura", label: "N° Factura", aliases: ["factura"] },
  { key: "numero_oc", label: "N° OC", aliases: ["oc", "orden compra"] },
  { key: "fecha_presentacion_afp", label: "Fecha Presentación AFP", type: "date", aliases: ["fecha presentacion", "fecha presentación"] },
  { key: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date", aliases: ["ingreso afp"] },
  { key: "fecha_pago_afp", label: "Fecha Pago AFP", type: "date", aliases: ["pago afp", "fecha pago"] },
  { key: "fecha_factura_finanfix", label: "Fecha Factura Finanfix", type: "date", aliases: ["fecha factura"] },
  { key: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date", aliases: ["pago factura"] },
  { key: "fecha_notificacion_cliente", label: "Fecha notificación cliente", type: "date", aliases: ["notificacion", "notificación"] },
  { key: "fecha_rechazo", label: "Fecha Rechazo", type: "date", aliases: ["rechazo fecha"] },
  { key: "motivo_rechazo", label: "Motivo del rechazo/anulación", aliases: ["motivo rechazo", "rechazo"] },
  { key: "estado_trabajador", label: "Estado Trabajador", aliases: ["trabajador"] },
  { key: "created_at", label: "Hora de creación", type: "date", aliases: ["creacion", "creación", "fecha creacion"] },
  { key: "updated_at", label: "Hora de modificación", type: "date", aliases: ["modificacion", "modificación"] },
  { key: "last_activity_at", label: "Hora de la última actividad", type: "date", aliases: ["ultima actividad", "última actividad"] },
];

function normalizeForMatch(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRecordValue(row: any, key: string) {
  if (key === "mandante") return row.mandante?.name || row.mandante_name || row.mandante || "";
  if (key === "razon_social") return row.razon_social || row.company?.razon_social || row.business_name || "";
  if (key === "rut") return row.rut || row.company?.rut || "";
  if (key === "entidad") return row.entidad || row.lineAfp?.afp_name || row.entity || "";
  return row[key] ?? "";
}

function findReportColumnByText(raw: string) {
  const target = normalizeForMatch(raw);
  if (!target) return null;
  return REPORT_COLUMNS.find((column) => {
    const names = [column.key, column.label, ...(column.aliases || [])].map(normalizeForMatch);
    return names.some((name) => name === target || target.includes(name) || name.includes(target));
  }) || null;
}

function requestedColumnsFromPrompt(prompt: string) {
  const normalized = normalizeForMatch(prompt);
  const selected: ReportColumn[] = [];

  for (const column of REPORT_COLUMNS) {
    const names = [column.key, column.label, ...(column.aliases || [])].map(normalizeForMatch);
    if (names.some((name) => name && normalized.includes(name))) selected.push(column);
  }

  const afterColumnWords = prompt.match(/(?:columnas|campos|con)\s*[:：]?\s*([^\.\n]+)/i)?.[1];
  if (afterColumnWords) {
    for (const part of afterColumnWords.split(/,|;| y | e /i)) {
      const column = findReportColumnByText(part);
      if (column) selected.push(column);
    }
  }

  const unique = new Map<string, ReportColumn>();
  for (const column of selected) unique.set(column.key, column);

  if (!unique.size) {
    ["mandante", "razon_social", "rut", "entidad", "estado_gestion", "monto_devolucion", "numero_solicitud"].forEach((key) => {
      const column = REPORT_COLUMNS.find((c) => c.key === key);
      if (column) unique.set(column.key, column);
    });
  }
  return [...unique.values()].slice(0, 14);
}

function applyPromptFilters(prompt: string, records: any[]) {
  const q = normalizeForMatch(prompt);
  const filters: string[] = [];
  let rows = [...records];

  const knownMandantes = [...new Set(records.map((r) => String(getRecordValue(r, "mandante") || "").trim()).filter(Boolean))];
  const mandanteMention = knownMandantes.find((name) => q.includes(normalizeForMatch(name)));
  if (mandanteMention) {
    rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "mandante"))) === normalizeForMatch(mandanteMention));
    filters.push(`Mandante = ${mandanteMention}`);
  }

  const entidadHints = ["modelo", "capital", "provida", "habitat", "hábitat", "cuprum", "planvital", "uno"];
  const entidadMention = entidadHints.find((name) => q.includes(normalizeForMatch(name)));
  if (entidadMention) {
    rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "entidad"))).includes(normalizeForMatch(entidadMention)));
    filters.push(`Entidad contiene ${entidadMention}`);
  }

  if (q.includes("pendiente")) {
    rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "estado_gestion"))).includes("pendiente"));
    filters.push("Estado contiene Pendiente");
  }
  if (q.includes("pagado") || q.includes("pagadas")) {
    rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "estado_gestion"))).includes("pag") || normalizeForMatch(String(r.facturado_cliente)).includes("pag"));
    filters.push("Estado/Facturación contiene Pagado");
  }
  if (q.includes("rechazo") || q.includes("rechaz")) {
    rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "estado_gestion"))).includes("rechaz") || String(getRecordValue(r, "motivo_rechazo")).trim());
    filters.push("Gestiones con rechazo");
  }
  if (q.includes("sin poder")) {
    rows = rows.filter((r) => !r.confirmacion_poder);
    filters.push("Sin confirmación de poder");
  }
  if (q.includes("sin cc") || q.includes("sin confirmacion cc") || q.includes("sin confirmación cc")) {
    rows = rows.filter((r) => !r.confirmacion_cc);
    filters.push("Sin confirmación CC");
  }

  if (q.includes("alto monto") || q.includes("mayor monto") || q.includes("montos altos")) {
    rows = rows.sort((a, b) => toNumber(getRecordValue(b, "monto_devolucion")) - toNumber(getRecordValue(a, "monto_devolucion")));
    filters.push("Ordenado por mayor monto");
  }

  return { rows, filters };
}

function formatReportCell(value: unknown, column: ReportColumn) {
  if (column.type === "money") return money(value);
  if (column.type === "boolean") return value === true || value === "true" || value === "Si" || value === "Sí" ? "Sí" : "No";
  if (column.type === "date") {
    if (!value) return "—";
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("es-CL");
  }
  return value === undefined || value === null || value === "" ? "—" : String(value);
}

function buildAiReport(prompt: string, records: any[]): AiReport | null {
  const q = normalizeForMatch(prompt);
  const wantsReport = /informe|reporte|tabla|listado|export|csv|columnas|campos/.test(q);
  if (!wantsReport) return null;

  const columns = requestedColumnsFromPrompt(prompt);
  const filtered = applyPromptFilters(prompt, records);
  const limitMatch = q.match(/(?:top|primeros|primeras|limite|límite)\s+(\d+)/);
  const limit = limitMatch ? Math.min(Number(limitMatch[1]), 100) : 50;
  const rows = filtered.rows.slice(0, limit).map((record) => {
    const row: Record<string, unknown> = {};
    for (const column of columns) row[column.key] = formatReportCell(getRecordValue(record, column.key), column);
    return row;
  });

  const title = prompt.match(/(?:informe|reporte|listado)\s+(?:de|del|para)?\s*([^\.\n]*)/i)?.[0]?.trim() || "Informe generado por IA";
  return {
    title,
    columns,
    rows,
    totalRows: filtered.rows.length,
    filtersApplied: filtered.filters,
    generatedAt: new Date().toISOString(),
  };
}

function reportToMarkdown(report: AiReport) {
  if (!report.rows.length) return `No encontré registros para el informe solicitado. Filtros aplicados: ${report.filtersApplied.join("; ") || "sin filtros"}.`;
  const header = report.columns.map((c) => c.label).join(" | ");
  const sep = report.columns.map(() => "---").join(" | ");
  const lines = report.rows.slice(0, 12).map((row) =>
    report.columns
      .map((c) => String(row[c.key] ?? "—").replace(/\r?\n/g, " "))
      .join(" | ")
  );

  return [
    `${report.title}`,
    "",
    `Registros encontrados: ${report.totalRows}. Mostrando: ${report.rows.length}.`,
    report.filtersApplied.length ? `Filtros: ${report.filtersApplied.join("; ")}` : "Filtros: sin filtros especiales",
    "",
    header,
    sep,
    ...lines,
    report.rows.length > 12 ? "..." : "",
  ]
    .filter(Boolean)
    .join("\n");

}

function sqlIdent(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function tableExists(tableName: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = $1) as exists`,
    tableName
  )) as { exists: boolean }[];
  return Boolean(rows?.[0]?.exists);
}

async function getExistingColumns(tableName: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    tableName
  )) as { column_name: string }[];
  return new Set(rows.map((row: { column_name: string }) => row.column_name));
}

function recordTitle(row: any) {
  return row.razon_social || row.company?.razon_social || row.business_name || "Sin razón social";
}

function compactRecord(row: any) {
  return {
    id: row.id,
    mandante: row.mandante?.name || "",
    razon_social: recordTitle(row),
    rut: row.rut || row.company?.rut || "",
    entidad: row.entidad || row.lineAfp?.afp_name || "",
    estado_gestion: row.estado_gestion || "",
    numero_solicitud: row.numero_solicitud || "",
    monto_devolucion: toNumber(row.monto_devolucion),
    monto_cliente: toNumber(row.monto_cliente),
    monto_finanfix: toNumber(row.monto_finanfix_solutions),
    monto_real_finanfix: toNumber(row.monto_real_finanfix_solutions),
    confirmacion_cc: row.confirmacion_cc,
    confirmacion_poder: row.confirmacion_poder,
    motivo_rechazo: row.motivo_rechazo || "",
    fecha_presentacion_afp: row.fecha_presentacion_afp,
    fecha_ingreso_afp: row.fecha_ingreso_afp,
    fecha_pago_afp: row.fecha_pago_afp,
    created_at: row.created_at,
    updated_at: row.updated_at,
    documentos: (row.documents || []).map((doc: any) => ({ id: doc.id, nombre: doc.file_name, categoria: doc.category })),
  };
}

async function loadDocumentsForRecordIds(recordIds: string[]) {
  if (!recordIds.length || !(await tableExists("documents"))) return new Map<string, any[]>();
  const docColumns = await getExistingColumns("documents");
  const selectable = ["id", "management_id", "related_record_id", "category", "file_name", "file_url", "mime_type", "created_at"].filter((c) => docColumns.has(c));
  if (!selectable.length) return new Map<string, any[]>();

  const whereParts: string[] = [];
  if (docColumns.has("management_id")) whereParts.push(`management_id = any($1)`);
  if (docColumns.has("related_record_id")) whereParts.push(`related_record_id = any($1)`);
  if (!whereParts.length) return new Map<string, any[]>();

  const order = docColumns.has("created_at") ? ` order by created_at desc` : "";
  const docs = (await prisma.$queryRawUnsafe(
    `select ${selectable.map((c) => sqlIdent(c)).join(", ")} from documents where ${whereParts.join(" or ")}${order}`,
    recordIds
  )) as any[];

  const map = new Map<string, any[]>();
  for (const doc of docs) {
    const keys = [doc.management_id, doc.related_record_id].filter(Boolean);
    for (const key of keys) {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
  }
  return map;
}

async function loadManagementRows(mandanteId?: string | null, limit = 120) {
  if (!(await tableExists("managements"))) return [];
  const columns = await getExistingColumns("managements");
  if (!columns.has("id")) return [];

  const selectedColumns = MANAGEMENT_FIELDS.filter((field) => columns.has(field));
  const selectParts = selectedColumns.map((field) => `m.${sqlIdent(field)} as ${sqlIdent(field)}`);

  const canJoinMandante = columns.has("mandante_id") && (await tableExists("mandantes"));
  const canJoinCompany = columns.has("company_id") && (await tableExists("companies"));
  const canJoinLineAfp = columns.has("line_afp_id") && (await tableExists("management_line_afps"));

  const joins: string[] = [];
  if (canJoinMandante) {
    const mandanteCols = await getExistingColumns("mandantes");
    if (mandanteCols.has("id") && mandanteCols.has("name")) {
      joins.push(`left join mandantes md on md.id = m.mandante_id`);
      selectParts.push(`md.name as mandante_name`);
    }
  }
  if (canJoinCompany) {
    const companyCols = await getExistingColumns("companies");
    if (companyCols.has("id")) {
      joins.push(`left join companies c on c.id = m.company_id`);
      if (companyCols.has("razon_social")) selectParts.push(`c.razon_social as company_razon_social`);
      if (companyCols.has("rut")) selectParts.push(`c.rut as company_rut`);
    }
  }
  if (canJoinLineAfp) {
    const afpCols = await getExistingColumns("management_line_afps");
    if (afpCols.has("id") && afpCols.has("afp_name")) {
      joins.push(`left join management_line_afps la on la.id = m.line_afp_id`);
      selectParts.push(`la.afp_name as line_afp_name`);
    }
  }

  const params: any[] = [];
  let where = "";
  if (mandanteId && columns.has("mandante_id")) {
    params.push(mandanteId);
    where = ` where m.mandante_id = $${params.length}`;
  }

  const orderField = columns.has("updated_at") ? "updated_at" : columns.has("created_at") ? "created_at" : "id";
  params.push(Math.min(Math.max(limit, 10), 300));

  const rows = (await prisma.$queryRawUnsafe(
    `select ${selectParts.join(", ")} from managements m ${joins.join(" ")}${where} order by m.${sqlIdent(orderField)} desc limit $${params.length}`,
    ...params
  )) as any[];

  const ids = rows.map((row: any) => row.id).filter(Boolean);
  const docsById = await loadDocumentsForRecordIds(ids);

  return rows.map((row: any) => ({
    ...row,
    mandante: { name: row.mandante_name || row.mandante || "" },
    company: { razon_social: row.company_razon_social || row.razon_social || "", rut: row.company_rut || row.rut || "" },
    lineAfp: { afp_name: row.line_afp_name || row.entidad || "" },
    documents: docsById.get(row.id) || [],
  }));
}

function normalizeLmLegacy(row: any) {
  const id = row.management_id || row.id;
  return {
    id,
    mandante_id: row.mandante_id || null,
    company_id: row.company_id || null,
    line_id: row.line_id || null,
    line_afp_id: row.line_afp_id || null,
    management_type: "LM",
    mandante: { name: row.mandante || "" },
    company: { razon_social: row.business_name || "", rut: row.rut || "" },
    lineAfp: { afp_name: row.entity || "" },
    razon_social: row.business_name || "",
    rut: row.rut || "",
    entidad: row.entity || "",
    estado_gestion: row.management_status || "",
    monto_devolucion: row.refund_amount || 0,
    monto_pagado: row.actual_paid_amount || 0,
    monto_cliente: row.monto_cliente || 0,
    monto_finanfix_solutions: row.monto_finanfix_solutions || 0,
    monto_real_cliente: row.monto_real_cliente || 0,
    monto_real_finanfix_solutions: row.monto_real_finanfix_solutions || 0,
    confirmacion_cc: row.confirmation_cc,
    confirmacion_poder: row.confirmation_power,
    motivo_tipo_exceso: row.motivo_tipo_exceso || row.excess_type_reason || "",
    estado_trabajador: row.worker_status || "",
    numero_solicitud: row.request_number || "",
    grupo_empresa: row.search_group || "",
    banco: row.bank_name || "",
    tipo_cuenta: row.account_type || "",
    numero_cuenta: row.account_number || "",
    acceso_portal: row.portal_access || "",
    mes_produccion_2026: row.mes_produccion_2026 || "",
    fecha_presentacion_afp: row.fecha_presentacion_afp || null,
    fecha_ingreso_afp: row.fecha_ingreso_afp || null,
    fecha_pago_afp: row.fecha_pago_afp || null,
    fecha_factura_finanfix: row.fecha_factura_finanfix || null,
    fecha_pago_factura_finanfix: row.fecha_pago_factura_finanfix || null,
    fecha_notificacion_cliente: row.fecha_notificacion_cliente || null,
    fecha_rechazo: row.fecha_rechazo || null,
    motivo_rechazo: row.motivo_rechazo || "",
    comment: row.comment || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_activity_at: row.last_activity_at || null,
    documents: [],
  };
}

function normalizeTpLegacy(row: any) {
  const id = row.management_id || row.id;
  return {
    id,
    mandante_id: row.mandante_id || null,
    company_id: row.company_id || null,
    line_id: row.line_id || null,
    line_afp_id: row.line_afp_id || null,
    management_type: "TP",
    mandante: { name: row.mandante || "" },
    company: { razon_social: row.business_name || "", rut: row.rut || "" },
    lineAfp: { afp_name: row.entity || "" },
    razon_social: row.business_name || "",
    rut: row.rut || "",
    entidad: row.entity || "",
    estado_gestion: row.management_status || "",
    monto_devolucion: row.refund_amount || 0,
    numero_solicitud: row.request_number || "",
    grupo_empresa: row.search_group || "",
    banco: row.bank_name || "",
    tipo_cuenta: row.account_type || "",
    numero_cuenta: row.account_number || "",
    acceso_portal: row.portal_access || "",
    mes_produccion_2026: row.mes_produccion_2026 || row.production_months || "",
    estado_contrato_cliente: row.estado_contrato_cliente || row.client_contract_status || "",
    fecha_termino_contrato: row.fecha_termino_contrato || row.contract_end_date || null,
    consulta_cen: row.consulta_cen || row.cen_query || "",
    contenido_cen: row.contenido_cen || row.cen_content || "",
    respuesta_cen: row.respuesta_cen || row.cen_response || "",
    comment: row.comment || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_activity_at: row.last_activity_at || null,
    documents: [],
  };
}

async function loadLegacyTable(tableName: "lm_records" | "tp_records", mandanteId?: string | null, limit = 120) {
  if (!(await tableExists(tableName))) return [];
  const columns = await getExistingColumns(tableName);
  if (!columns.has("id")) return [];
  const fieldList = tableName === "lm_records" ? LM_LEGACY_FIELDS : TP_LEGACY_FIELDS;
  const selected = fieldList.filter((field) => columns.has(field));
  const params: any[] = [];
  let where = "";
  if (mandanteId && columns.has("mandante_id")) {
    params.push(mandanteId);
    where = ` where ${sqlIdent("mandante_id")} = $${params.length}`;
  }
  const orderField = columns.has("updated_at") ? "updated_at" : columns.has("created_at") ? "created_at" : "id";
  params.push(Math.min(Math.max(limit, 10), 300));
  const rows = (await prisma.$queryRawUnsafe(
    `select ${selected.map((field) => sqlIdent(field)).join(", ")} from ${tableName}${where} order by ${sqlIdent(orderField)} desc limit $${params.length}`,
    ...params
  )) as any[];
  return rows.map((row: any) => (tableName === "lm_records" ? normalizeLmLegacy(row) : normalizeTpLegacy(row)));
}

async function loadRecords(mandanteId?: string | null, limit = 120) {
  let rows: any[] = [];

  try {
    rows = await loadManagementRows(mandanteId, limit);
  } catch (error: any) {
    console.warn("IA: no se pudo leer managements con consulta compatible:", error?.message || error);
    rows = [];
  }

  if (!rows.length) {
    const [lmRows, tpRows] = await Promise.all([
      loadLegacyTable("lm_records", mandanteId, Math.ceil(limit / 2)),
      loadLegacyTable("tp_records", mandanteId, Math.ceil(limit / 2)),
    ]);
    rows = [...lmRows, ...tpRows].slice(0, limit);
  }

  const ids = rows.map((row) => row.id).filter(Boolean);
  const docsById = await loadDocumentsForRecordIds(ids);
  return rows.map((row: any) => ({ ...row, documents: row.documents?.length ? row.documents : docsById.get(row.id) || [] }));
}

function buildLocalAnswer(prompt: string, records: any[]) {
  const q = prompt.toLowerCase();
  const total = records.length;
  const totalMonto = records.reduce((acc, r) => acc + toNumber(r.monto_devolucion), 0);
  const pending = records.filter((r) => !/pagad|cerrad|rechaz/i.test(String(r.estado_gestion || "")));
  const high = [...records].sort((a, b) => toNumber(b.monto_devolucion) - toNumber(a.monto_devolucion)).slice(0, 8);
  const missingPower = records.filter((r) => !r.confirmacion_poder);
  const missingCc = records.filter((r) => !r.confirmacion_cc);

  const byMandante = new Map<string, number>();
  const byEntidad = new Map<string, number>();
  const byEstado = new Map<string, number>();
  for (const r of records) {
    byMandante.set(r.mandante?.name || "Sin mandante", (byMandante.get(r.mandante?.name || "Sin mandante") || 0) + 1);
    byEntidad.set(r.entidad || r.lineAfp?.afp_name || "Sin entidad", (byEntidad.get(r.entidad || r.lineAfp?.afp_name || "Sin entidad") || 0) + 1);
    byEstado.set(r.estado_gestion || "Sin estado", (byEstado.get(r.estado_gestion || "Sin estado") || 0) + 1);
  }

  const lines = [
    "Informe IA Operafix",
    "",
    `Gestiones analizadas: ${total}`,
    `Monto devolución total: ${money(totalMonto)}`,
    `Gestiones pendientes o abiertas: ${pending.length}`,
    `Sin confirmación de poder: ${missingPower.length}`,
    `Sin confirmación CC: ${missingCc.length}`,
    "",
    "Distribución por estado:",
    ...[...byEstado.entries()].slice(0, 8).map(([name, count]) => `- ${name}: ${count}`),
    "",
    "Distribución por entidad:",
    ...[...byEntidad.entries()].slice(0, 8).map(([name, count]) => `- ${name}: ${count}`),
    "",
    "Top gestiones por monto:",
    ...high.map((r, i) => `${i + 1}. ${recordTitle(r)} · ${r.rut || r.company?.rut || "Sin RUT"} · ${r.entidad || r.lineAfp?.afp_name || "Sin AFP"} · ${money(r.monto_devolucion)} · ${r.estado_gestion || "Sin estado"}`),
    "",
    "Recomendación:",
    "Priorizar gestiones de alto monto, sin poder/CC y aquellas presentadas ante AFP que no tienen respuesta reciente.",
  ];

  if (q.includes("correo")) {
    lines.push("", "Borrador sugerido:", "Estimados, junto con saludar, solicitamos actualización del estado de las gestiones indicadas y confirmación de recepción de antecedentes. Quedamos atentos a sus comentarios.");
  }

  if (q.includes("mandante")) {
    lines.splice(8, 0, "", "Distribución por mandante:", ...[...byMandante.entries()].slice(0, 8).map(([name, count]) => `- ${name}: ${count}`));
  }

  return lines.join("\n");
}

function buildRuleActions(prompt: string, records: any[]): AiAction[] {
  const q = prompt.toLowerCase();
  const actions: AiAction[] = [];

  const selected = records
    .filter((r) => {
      if (q.includes("rechaz")) return /rechaz/i.test(text(r.estado_gestion));
      if (q.includes("pag")) return /pag/i.test(text(r.estado_gestion));
      if (q.includes("poder")) return !r.confirmacion_poder;
      if (q.includes("cc") || q.includes("cuenta")) return !r.confirmacion_cc;
      if (q.includes("afp modelo")) return /modelo/i.test(`${r.entidad} ${r.lineAfp?.afp_name}`);
      if (q.includes("afp capital")) return /capital/i.test(`${r.entidad} ${r.lineAfp?.afp_name}`);
      return toNumber(r.monto_devolucion) >= 500000 || !r.confirmacion_poder || !r.confirmacion_cc;
    })
    .slice(0, 8);

  for (const r of selected) {
    if (!r.confirmacion_poder) {
      actions.push({
        type: "CREATE_TASK",
        recordId: r.id,
        label: `Crear tarea: solicitar poder para ${recordTitle(r)}`,
        payload: { title: "Solicitar poder", description: `Solicitar/validar poder para ${recordTitle(r)} (${r.rut || r.company?.rut || "Sin RUT"}).` },
      });
    }
    if (!r.confirmacion_cc) {
      actions.push({
        type: "CREATE_TASK",
        recordId: r.id,
        label: `Crear tarea: validar cuenta corriente para ${recordTitle(r)}`,
        payload: { title: "Validar CC", description: `Validar datos bancarios para ${recordTitle(r)} antes de pago/devolución.` },
      });
    }
    if (/ingreso|present|enviad/i.test(text(r.estado_gestion))) {
      actions.push({
        type: "ADD_NOTE",
        recordId: r.id,
        label: `Agregar nota de seguimiento a ${recordTitle(r)}`,
        payload: { content: "IA sugiere seguimiento con entidad por gestión ingresada/presentada sin cierre visible." },
      });
    }
    if (q.includes("cambiar") && q.includes("seguimiento")) {
      actions.push({
        type: "UPDATE_STATUS",
        recordId: r.id,
        label: `Cambiar estado a Seguimiento entidad: ${recordTitle(r)}`,
        payload: { estado_gestion: "Seguimiento entidad" },
      });
    }
    actions.push({
      type: "CREATE_EMAIL_DRAFT",
      recordId: r.id,
      label: `Preparar borrador de correo para ${recordTitle(r)}`,
      payload: {
        subject: `Seguimiento gestión ${r.numero_solicitud || r.rut || ""}`.trim(),
        body: `Estimados, junto con saludar, solicitamos actualización de la gestión asociada a ${recordTitle(r)}, RUT ${r.rut || r.company?.rut || ""}, entidad ${r.entidad || r.lineAfp?.afp_name || ""}. Quedamos atentos.`,
      },
    });
  }

  return actions.slice(0, 12).map((action, index) => ({ ...action, id: `${action.type}-${action.recordId}-${index}` }));
}

async function callOpenAI(prompt: string, records: any[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const compact = records.map(compactRecord).slice(0, 80);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Eres la IA operativa de Operafix/Finanfix. Analiza gestiones de recuperación LM/TP. Responde en español de Chile, con foco ejecutivo, operativo y accionable. No inventes datos: usa solo el contexto entregado. Si recomiendas acciones, hazlas concretas.",
        },
        { role: "user", content: `Pregunta: ${prompt}\n\nRegistros disponibles en JSON:\n${JSON.stringify(compact)}` },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${detail}`);
  }

  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

async function createActivity(recordId: string, type: string, status: string, description: string, dueDate?: Date | null) {
  try {
    const columns = await getExistingColumns("activities");
    if (!columns.has("related_module") || !columns.has("related_record_id")) return;

    const data: Record<string, unknown> = {
      related_module: "records",
      related_record_id: recordId,
      management_id: columns.has("management_id") ? recordId : undefined,
      activity_type: type,
      status,
      description,
      due_date: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const entries = Object.entries(data).filter(([key, value]) => columns.has(key) && value !== undefined);
    if (!entries.length) return;
    const sqlColumns = entries.map(([key]) => sqlIdent(key)).join(", ");
    const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
    await prisma.$executeRawUnsafe(`insert into activities (${sqlColumns}) values (${placeholders})`, ...entries.map(([, value]) => value));
  } catch (error) {
    console.warn("No se pudo registrar actividad IA:", error);
  }
}

async function safeUpdateManagement(recordId: string, data: Record<string, unknown>) {
  if (!(await tableExists("managements"))) return false;
  const columns = await getExistingColumns("managements");
  const entries = Object.entries(data).filter(([key, value]) => columns.has(key) && value !== undefined);
  if (!columns.has("id") || !entries.length) return false;
  const setSql = entries.map(([key], index) => `${sqlIdent(key)} = $${index + 1}`).join(", ");
  await prisma.$executeRawUnsafe(`update managements set ${setSql} where id = $${entries.length + 1}`, ...entries.map(([, value]) => value), recordId);
  return true;
}

async function createNote(recordId: string, content: string) {
  const columns = await getExistingColumns("notes");
  const data: Record<string, unknown> = {
    related_module: "records",
    related_record_id: recordId,
    management_id: columns.has("management_id") ? recordId : undefined,
    content,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const entries = Object.entries(data).filter(([key, value]) => columns.has(key) && value !== undefined);
  const sqlColumns = entries.map(([key]) => sqlIdent(key)).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const rows = (await prisma.$queryRawUnsafe(`insert into notes (${sqlColumns}) values (${placeholders}) returning *`, ...entries.map(([, value]) => value))) as any[];
  return rows?.[0] || { content };
}

aiActionsRouter.post("/chat", async (req, res) => {
  try {
    const prompt = text(req.body?.message || req.body?.prompt).trim();
    const mandanteId = text(req.body?.mandante_id || req.body?.mandanteId).trim() || null;
    if (!prompt) return res.status(400).json({ message: "Debes enviar una pregunta para la IA." });

    const records = await loadRecords(mandanteId, 160);
    const report = buildAiReport(prompt, records);
    let answer: string | null = null;
    let source: "openai" | "local" = "local";

    try {
      answer = await callOpenAI(prompt, records);
      if (answer) source = "openai";
    } catch (aiError: any) {
      console.warn("IA externa no disponible, se usa análisis local:", aiError?.message || aiError);
    }

    if (report) {
      const reportSummary = reportToMarkdown(report);
      answer = answer
        ? `${answer}

---

${reportSummary}

Puedes pedirme otro informe indicando las columnas exactas que quieres usar, por ejemplo: RUT, Razón Social, Entidad, Estado Gestión, Monto Devolución y N° Solicitud.`
        : `${reportSummary}

Puedes pedirme otro informe indicando las columnas exactas que quieres usar, por ejemplo: RUT, Razón Social, Entidad, Estado Gestión, Monto Devolución y N° Solicitud.`;
    }

    if (!answer) answer = buildLocalAnswer(prompt, records);
    const actions = buildRuleActions(prompt, records);

    return res.json({
      answer,
      actions,
      report,
      available_columns: REPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label, type: column.type || "text" })),
      source,
      analyzed_records: records.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("ERROR /api/ai/chat:", error?.message || error);
    return res.status(500).json({ message: "No se pudo procesar la solicitud de IA.", detail: String(error?.message || error) });
  }
});

aiActionsRouter.post("/execute", async (req, res) => {
  try {
    const action = req.body?.action as AiAction;
    const confirmed = req.body?.confirmed === true;
    if (!confirmed) return res.status(400).json({ message: "La acción requiere confirmación explícita." });
    if (!action?.recordId || !action?.type) return res.status(400).json({ message: "Acción inválida." });

    const recordId = String(action.recordId);
    const payload = action.payload || {};

    if (action.type === "UPDATE_STATUS") {
      const nextStatus = text(payload.estado_gestion || payload.status).trim();
      if (!nextStatus) return res.status(400).json({ message: "Falta estado_gestion." });
      const ok = await safeUpdateManagement(recordId, { estado_gestion: nextStatus, last_activity_at: new Date(), updated_at: new Date() });
      await createActivity(recordId, "IA_ACCIÓN", ok ? "Completada" : "Pendiente", `IA cambió Estado Gestión a: ${nextStatus}`);
      return res.json({ ok: true, message: ok ? "Estado actualizado por IA." : "Acción registrada; no se pudo actualizar managements porque el registro es legacy." });
    }

    if (action.type === "ADD_NOTE") {
      const content = text(payload.content || payload.note || "Nota creada por IA.");
      const note = await createNote(recordId, content);
      await createActivity(recordId, "IA_NOTA", "Completada", `IA agregó nota: ${content}`);
      return res.json({ ok: true, message: "Nota agregada por IA.", note });
    }

    if (action.type === "CREATE_TASK") {
      const title = text(payload.title || "Tarea sugerida por IA");
      const description = text(payload.description || action.label || "Acción sugerida por IA.");
      const due = payload.due_date ? new Date(payload.due_date) : null;
      await createActivity(recordId, "TAREA_IA", "Pendiente", `${title}: ${description}`, due && !Number.isNaN(due.getTime()) ? due : null);
      return res.json({ ok: true, message: "Tarea creada por IA." });
    }

    if (action.type === "MARK_CONFIRMATION") {
      const data: Record<string, unknown> = {};
      if (typeof payload.confirmacion_cc === "boolean") data.confirmacion_cc = payload.confirmacion_cc;
      if (typeof payload.confirmacion_poder === "boolean") data.confirmacion_poder = payload.confirmacion_poder;
      if (!Object.keys(data).length) return res.status(400).json({ message: "No hay confirmación válida para actualizar." });
      data.last_activity_at = new Date();
      data.updated_at = new Date();
      const ok = await safeUpdateManagement(recordId, data);
      await createActivity(recordId, "IA_ACCIÓN", ok ? "Completada" : "Pendiente", `IA actualizó confirmaciones: ${JSON.stringify(data)}`);
      return res.json({ ok: true, message: ok ? "Confirmaciones actualizadas por IA." : "Acción registrada; no se pudo actualizar managements porque el registro es legacy." });
    }

    if (action.type === "CREATE_EMAIL_DRAFT") {
      const subject = text(payload.subject || "Borrador generado por IA");
      const body = text(payload.body || "");
      await createActivity(recordId, "BORRADOR_CORREO_IA", "Borrador", `Asunto: ${subject}\n\n${body}`);
      return res.json({ ok: true, message: "Borrador de correo registrado en cronología." });
    }

    return res.status(400).json({ message: "Tipo de acción IA no soportado." });
  } catch (error: any) {
    console.error("ERROR /api/ai/execute:", error?.message || error);
    return res.status(500).json({ message: "No se pudo ejecutar la acción IA.", detail: String(error?.message || error) });
  }
});

export default aiActionsRouter;
