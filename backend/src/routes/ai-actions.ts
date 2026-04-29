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

function normalizeBusinessPrompt(value: string) {
  const normalized = normalizeForMatch(value);
  const replacements: Array<[RegExp, string]> = [
    [/\bplata\b/g, " monto devolucion dinero recuperable "],
    [/\blucas\b/g, " monto devolucion dinero recuperable "],
    [/\bpega\b/g, " gestion seguimiento tarea "],
    [/\bsaca\b/g, " crea genera muestra "],
    [/\bmandame\b/g, " genera envia "],
    [/\bmandante\b/g, " mandante cliente "],
    [/\bafp\b/g, " entidad afp "],
    [/\bmodelo\b/g, " modelo afp modelo "],
    [/\bcapital\b/g, " capital afp capital "],
  ];
  return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), normalized);
}

function extractUserProfile(body: any) {
  const name = text(body?.user_name || body?.userName || body?.profile?.name || body?.profile?.nombre).trim();
  const role = text(body?.user_role || body?.userRole || body?.profile?.role || body?.profile?.rol).trim();
  return { name, role };
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
  const q = normalizeBusinessPrompt(prompt);
  const filters: string[] = [];
  let rows = [...records];

  const knownMandantes = [...new Set(records.map((r) => String(getRecordValue(r, "mandante") || "").trim()).filter(Boolean))];
  const mandanteMention = knownMandantes.find((name) => q.includes(normalizeForMatch(name)));
  if (mandanteMention) {
    rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "mandante"))) === normalizeForMatch(mandanteMention));
    filters.push(`Mandante = ${mandanteMention}`);
  }

  const entidadHints = ["modelo", "capital", "provida", "habitat", "hábitat", "cuprum", "planvital", "uno", "afp modelo", "afp capital", "afp provida", "afp habitat", "afp cuprum"];
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
  const q = normalizeBusinessPrompt(prompt);
  const wantsReport = /informe|reporte|tabla|listado|export|csv|excel|xlsx|descargar|archivo|planilla|columnas|campos/.test(q);
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
  // IMPORTANTE:
  // La tabla visible en "Registros de empresas" del CRM puede venir desde las tablas legacy
  // lm_records / tp_records. En Railway existían además registros demo en managements
  // (Acciona / Finanfix) que contaminaban la IA. Por eso la IA ahora usa la misma fuente
  // operativa real: primero legacy LM/TP, y solo si no hay nada usa managements.
  let rows: any[] = [];

  try {
    const [lmRows, tpRows] = await Promise.all([
      loadLegacyTable("lm_records", mandanteId, Math.ceil(limit / 2)),
      loadLegacyTable("tp_records", mandanteId, Math.ceil(limit / 2)),
    ]);
    rows = [...lmRows, ...tpRows].slice(0, limit);
  } catch (error: any) {
    console.warn("IA: no se pudo leer tablas legacy LM/TP:", error?.message || error);
    rows = [];
  }

  if (!rows.length) {
    try {
      rows = await loadManagementRows(mandanteId, limit);
    } catch (error: any) {
      console.warn("IA: no se pudo leer managements con consulta compatible:", error?.message || error);
      rows = [];
    }
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

function matchRecordsFromPrompt(prompt: string, records: any[]) {
  const q = normalizeBusinessPrompt(prompt);
  const rutMatch = prompt.match(/\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]\b/);
  const rutNeedle = rutMatch ? normalizeForMatch(rutMatch[0]) : "";

  let rows = [...records];

  if (rutNeedle) {
    rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "rut"))).replace(/\s/g, "").includes(rutNeedle.replace(/\s/g, "")));
  }

  const knownMandantes = [...new Set(records.map((r) => String(getRecordValue(r, "mandante") || "").trim()).filter(Boolean))];
  const mandanteMention = knownMandantes.find((name) => q.includes(normalizeForMatch(name)));
  if (mandanteMention) rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "mandante"))) === normalizeForMatch(mandanteMention));

  const knownEntities = [...new Set(records.map((r) => String(getRecordValue(r, "entidad") || "").trim()).filter(Boolean))];
  const entityMention = knownEntities.find((name) => q.includes(normalizeForMatch(name)));
  if (entityMention) rows = rows.filter((r) => normalizeForMatch(String(getRecordValue(r, "entidad"))).includes(normalizeForMatch(entityMention)));

  const razonMention = records.find((r) => {
    const razon = normalizeForMatch(String(getRecordValue(r, "razon_social")));
    return razon.length > 4 && q.includes(razon);
  });
  if (razonMention) rows = rows.filter((r) => r.id === razonMention.id);

  if (q.includes("sin poder")) rows = rows.filter((r) => !r.confirmacion_poder);
  if (q.includes("sin cc") || q.includes("sin confirmacion cc") || q.includes("sin confirmación cc")) rows = rows.filter((r) => !r.confirmacion_cc);
  if (q.includes("alto monto") || q.includes("mayor monto") || q.includes("montos altos")) rows = rows.sort((a, b) => toNumber(getRecordValue(b, "monto_devolucion")) - toNumber(getRecordValue(a, "monto_devolucion")));

  return rows.slice(0, 10);
}

function inferStatusFromPrompt(prompt: string) {
  const q = normalizeBusinessPrompt(prompt);
  if (q.includes("pagado") || q.includes("pagada") || q.includes("pago realizado")) return "Pagado";
  if (q.includes("rechazo") || q.includes("rechazado") || q.includes("rechazada")) return "Rechazo";
  if (q.includes("pendiente")) return "Pendiente Gestión";
  if (q.includes("ingreso por parte") || q.includes("n solicitud") || q.includes("numero solicitud") || q.includes("número solicitud")) return "Ingreso por parte de entidad";
  if (q.includes("ingreso solicitud") || q.includes("ingresada a entidad") || q.includes("ingresado a entidad")) return "Ingreso solicitud a entidad";
  if (q.includes("gestionado") || q.includes("gestionada")) return "Gestionado";
  return null;
}

function extractQuotedOrAfter(prompt: string, keywords: string[]) {
  const quoted = prompt.match(/["“”']([^"“”']{3,500})["“”']/)?.[1];
  if (quoted) return quoted.trim();
  const pattern = new RegExp(`(?:${keywords.join("|")})\\s*:?\\s*(.{3,500})`, "i");
  return prompt.match(pattern)?.[1]?.trim() || "";
}

function buildRuleActions(prompt: string, records: any[]): AiAction[] {
  const q = normalizeBusinessPrompt(prompt);
  const actions: AiAction[] = [];
  const selected = matchRecordsFromPrompt(prompt, records);
  const limited = selected.length ? selected : records.slice(0, 8);

  const wantsUpdateStatus = /(cambia|cambiar|marca|marcar|actualiza|actualizar).*(estado|gestion|gestión)|como\s+(pagado|rechazo|pendiente|gestionado)/i.test(prompt);
  const inferredStatus = inferStatusFromPrompt(prompt);
  if (wantsUpdateStatus && inferredStatus) {
    for (const r of limited.slice(0, 8)) {
      actions.push({
        type: "UPDATE_STATUS",
        recordId: r.id,
        label: `Cambiar estado de ${recordTitle(r)} a ${inferredStatus}`,
        payload: { estado_gestion: inferredStatus },
      });
    }
  }

  const wantsNote = /(agrega|agregar|crea|crear|deja|registrar).*(nota|comentario)/i.test(prompt);
  if (wantsNote) {
    const content = extractQuotedOrAfter(prompt, ["nota", "comentario", "observacion", "observación"]) || "Nota creada por IA operativa.";
    for (const r of limited.slice(0, 8)) {
      actions.push({
        type: "ADD_NOTE",
        recordId: r.id,
        label: `Agregar nota en ${recordTitle(r)}`,
        payload: { content },
      });
    }
  }

  const wantsTask = /(crea|crear|agenda|agendar|programa|programar).*(tarea|seguimiento|recordatorio)/i.test(prompt);
  if (wantsTask) {
    const description = extractQuotedOrAfter(prompt, ["tarea", "seguimiento", "recordatorio"]) || "Seguimiento creado por IA operativa.";
    for (const r of limited.slice(0, 8)) {
      actions.push({
        type: "CREATE_TASK",
        recordId: r.id,
        label: `Crear tarea de seguimiento para ${recordTitle(r)}`,
        payload: { title: "Seguimiento IA", description },
      });
    }
  }

  const wantsConfirm = /(marca|marcar|actualiza|actualizar|confirma|confirmar).*(poder|cc|cuenta corriente)/i.test(prompt);
  if (wantsConfirm) {
    const payload: Record<string, boolean> = {};
    if (q.includes("poder")) payload.confirmacion_poder = !(q.includes("sin poder") || q.includes("no poder"));
    if (q.includes("cc") || q.includes("cuenta corriente")) payload.confirmacion_cc = !(q.includes("sin cc") || q.includes("sin cuenta"));
    if (Object.keys(payload).length) {
      for (const r of limited.slice(0, 8)) {
        actions.push({
          type: "MARK_CONFIRMATION",
          recordId: r.id,
          label: `Actualizar confirmación en ${recordTitle(r)}`,
          payload,
        });
      }
    }
  }

  const wantsEmail = /(correo|email|mail|borrador|seguimiento a entidad)/i.test(prompt);
  if (wantsEmail) {
    for (const r of limited.slice(0, 8)) {
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
  }

  if (!actions.length && /(accion|acciones|priorizar|prioridad|alto monto|sin poder|sin cc|detenid|seguimiento)/i.test(prompt)) {
    const suggested = limited
      .filter((r) => toNumber(r.monto_devolucion) >= 500000 || !r.confirmacion_poder || !r.confirmacion_cc || /pendiente/i.test(text(r.estado_gestion)))
      .slice(0, 8);

    for (const r of suggested) {
      if (!r.confirmacion_poder) {
        actions.push({
          type: "CREATE_TASK",
          recordId: r.id,
          label: `Crear tarea: solicitar poder para ${recordTitle(r)}`,
          payload: { title: "Solicitar poder", description: `Solicitar poder vigente para ${recordTitle(r)}, RUT ${r.rut || r.company?.rut || ""}.` },
        });
      }
      if (!r.confirmacion_cc) {
        actions.push({
          type: "CREATE_TASK",
          recordId: r.id,
          label: `Crear tarea: confirmar CC para ${recordTitle(r)}`,
          payload: { title: "Confirmar cuenta corriente", description: `Confirmar datos bancarios/CC para ${recordTitle(r)}.` },
        });
      }
      actions.push({
        type: "CREATE_EMAIL_DRAFT",
        recordId: r.id,
        label: `Preparar correo de seguimiento para ${recordTitle(r)}`,
        payload: {
          subject: `Seguimiento gestión ${r.numero_solicitud || r.rut || ""}`.trim(),
          body: `Estimados, solicitamos actualización del estado de la gestión de ${recordTitle(r)}, RUT ${r.rut || r.company?.rut || ""}.`,
        },
      });
    }
  }

  const unique = new Map<string, AiAction>();
  for (const action of actions) {
    const key = `${action.type}-${action.recordId}-${JSON.stringify(action.payload || {})}`;
    if (!unique.has(key)) unique.set(key, action);
  }

  return [...unique.values()].slice(0, 12).map((action, index) => ({ ...action, id: `${action.type}-${action.recordId}-${index}` }));
}

function getRequiredOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("OPENAI_API_KEY no configurada en Railway/backend. La IA no tiene modo local en v51.");
  }
  return apiKey.trim();
}

function getOpenAIModel() {
  return (process.env.OPENAI_MODEL || "gpt-5.5").trim();
}

function extractResponsesText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

async function callOpenAI(prompt: string, records: any[], userProfile?: { name?: string; role?: string }, report?: AiReport | null) {
  const apiKey = getRequiredOpenAIApiKey();
  const model = getOpenAIModel();

  const compact = records.map(compactRecord).slice(0, 160);
  const userIdentity = userProfile?.name
    ? `Usuario identificado: ${userProfile.name}${userProfile.role ? ` (${userProfile.role})` : ""}.`
    : "Usuario no identificado todavía. Si la solicitud es amplia, ambigua o pide ejecutar acciones, pregunta primero: ¿quién eres y qué rol tienes en la operación?";

  const reportContext = report
    ? `

El sistema ya construyó un informe determinístico desde la base real. Resumen del informe:
${reportToMarkdown(report)}

No expliques pasos para crear Excel. Indica que el informe está listo para copiar/descargar y agrega una lectura ejecutiva breve.`
    : "";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "developer",
          content:
            `Eres la IA estratégica y operativa de OperaFix/Finanfix. ${userIdentity}
` +
            "Trabajas con recuperaciones LM/TP, AFP, mandantes, montos de devolución, poder, CC, estados y solicitudes. " +
            "Entiende español informal/chileno, errores de tipeo y solicitudes poco formales. Ejemplos: 'sácame', 'dame la pega', 'plata', 'lucas', 'mundo previsional', 'modelo'. " +
            "No inventes datos. Usa solo el JSON entregado y respeta filtros del usuario como mandante, AFP, estado, sin CC o sin poder. " +
            "Si el usuario pide columnas específicas, respeta esas columnas. Si pide separar por mandante, presenta secciones por mandante. " +
            "Si faltan datos, dilo claramente. Si recomiendas acciones, deben ser específicas, operativas y seguras. " +
            "Nunca digas que el usuario debe abrir Excel manualmente: el CRM entrega tabla/descarga cuando corresponde.",
        },
        {
          role: "user",
          content: `Solicitud del usuario: ${prompt}
${reportContext}

Registros reales disponibles en JSON:
${JSON.stringify(compact)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI ${model} error ${response.status}: ${detail}`);
  }

  const data: any = await response.json();
  const answer = extractResponsesText(data);
  if (!answer) throw new Error(`OpenAI ${model} no devolvió texto utilizable.`);
  return answer;
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
    const userProfile = extractUserProfile(req.body);
    if (!prompt) return res.status(400).json({ message: "Debes enviar una pregunta para la IA." });

    const records = await loadRecords(mandanteId, 180);
    const report = buildAiReport(prompt, records);

    // v51: OpenAI es obligatorio. No existe fallback local.
    // Los informes descargables se construyen con datos reales para garantizar columnas/filtros,
    // pero la respuesta conversacional siempre pasa por GPT-5.5.
    const openAiAnswer = await callOpenAI(prompt, records, userProfile, report);
    const answer = report
      ? `${openAiAnswer}

${reportToMarkdown(report)}

Informe listo. Puedes copiar la tabla o descargarla desde el botón del chat.`
      : openAiAnswer;
    const actions = buildRuleActions(prompt, records);

    return res.json({
      answer,
      actions,
      report,
      available_columns: REPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label, type: column.type || "text" })),
      source: "openai",
      engine: `OpenAI ${getOpenAIModel()}`,
      analyzed_records: records.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("ERROR /api/ai/chat:", error?.message || error);
    const message = String(error?.message || error);
    const status = message.includes("OPENAI_API_KEY") ? 500 : message.startsWith("OpenAI") ? 502 : 500;
    return res.status(status).json({
      message: "No se pudo procesar la solicitud de IA con OpenAI. En v51 no existe modo local.",
      detail: message,
      source: "openai_required",
      engine: `OpenAI ${getOpenAIModel()}`,
    });
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


// Diagnóstico rápido para verificar qué registros está leyendo la IA.
aiActionsRouter.get("/debug-records", async (req, res) => {
  try {
    const mandanteId = typeof req.query.mandante_id === "string" ? req.query.mandante_id : null;
    const records = await loadRecords(mandanteId, 20);
    res.json({
      total: records.length,
      records: records.map((r) => ({
        id: r.id,
        mandante: getRecordValue(r, "mandante"),
        razon_social: getRecordValue(r, "razon_social"),
        rut: getRecordValue(r, "rut"),
        entidad: getRecordValue(r, "entidad"),
        estado_gestion: getRecordValue(r, "estado_gestion"),
        monto_devolucion: getRecordValue(r, "monto_devolucion"),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ message: "No se pudo diagnosticar registros IA", detail: String(error?.message || error) });
  }
});

export default aiActionsRouter;
