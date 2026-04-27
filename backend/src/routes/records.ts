import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";

const recordsRouter = Router();

const storageRoot = path.resolve(process.cwd(), "storage", "management-documents");
if (!fs.existsSync(storageRoot)) fs.mkdirSync(storageRoot, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storageRoot),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ ]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

function hasOwn(body: any, key: string) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function nullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function isAutoLineAfpValue(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  const raw = String(value).trim().toLowerCase();
  return (
    raw === "auto" ||
    raw === "automatico" ||
    raw === "automático" ||
    raw.includes("crear automáticamente") ||
    raw.includes("crear automaticamente") ||
    raw.includes("razón social") ||
    raw.includes("razon social")
  );
}

function cleanRecordBody(body: any) {
  const clean = { ...(body || {}) };
  if (isAutoLineAfpValue(clean.line_afp_id) || isAutoLineAfpValue(clean.afp_linea) || isAutoLineAfpValue(clean.linea_afp)) {
    delete clean.line_afp_id;
    delete clean.afp_linea;
    delete clean.linea_afp;
  }
  if (clean.line_afp_id && !String(clean.line_afp_id).startsWith("c") && String(clean.line_afp_id).length < 12) {
    delete clean.line_afp_id;
  }
  return clean;
}

function nullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toBoolean(value: unknown) {
  return value === true || value === "true" || value === "1" || value === "Sí" || value === "Si";
}

function mapDocumentCategory(value: unknown) {
  const raw = String(value || "OTRO").trim().toLowerCase();
  const map: Record<string, any> = {
    poder: "PODER",
    "carta explicativa": "CARTA_EXPLICATIVA",
    "archivo afp": "ARCHIVO_AFP",
    "archivo gestión": "ARCHIVO_GESTION",
    "archivo gestion": "ARCHIVO_GESTION",
    "detalle de pago": "DETALLE_TRABAJADORES",
    "detalle trabajadores": "DETALLE_TRABAJADORES",
    "comprobante pago": "COMPROBANTE_PAGO",
    "comprobante de pago": "COMPROBANTE_PAGO",
    "comprobante rechazo": "OTRO",
    "archivo respuesta cen": "RESPUESTA_CEN",
    factura: "FACTURA",
    oc: "ORDEN_COMPRA",
    "orden de compra": "ORDEN_COMPRA",
    otro: "OTRO",
  };
  return map[raw] || "OTRO";
}

const fieldParsers: Record<string, (value: unknown) => unknown> = {
  management_type: (v) => (v === "TP" ? "TP" : "LM"),
  owner_name: nullableString,
  estado_contrato_cliente: nullableString,
  fecha_termino_contrato: nullableDate,
  motivo_tipo_exceso: nullableString,
  mes_produccion_2026: nullableString,
  mes_ingreso_solicitud: nullableString,
  entidad: nullableString,
  envio_afp: nullableString,
  estado_gestion: nullableString,
  fecha_presentacion_afp: nullableDate,
  fecha_ingreso_afp: nullableDate,
  fecha_pago_afp: nullableDate,
  numero_solicitud: nullableString,
  grupo_empresa: nullableString,
  razon_social: nullableString,
  rut: nullableString,
  direccion: nullableString,
  monto_devolucion: nullableNumber,
  monto_pagado: nullableNumber,
  monto_cliente: nullableNumber,
  monto_finanfix_solutions: nullableNumber,
  monto_real_cliente: nullableNumber,
  monto_real_finanfix_solutions: nullableNumber,
  fee: nullableNumber,
  banco: nullableString,
  tipo_cuenta: nullableString,
  numero_cuenta: nullableString,
  confirmacion_cc: toBoolean,
  confirmacion_poder: toBoolean,
  acceso_portal: nullableString,
  facturado_finanfix: nullableString,
  facturado_cliente: nullableString,
  fecha_factura_finanfix: nullableDate,
  fecha_pago_factura_finanfix: nullableDate,
  fecha_notificacion_cliente: nullableDate,
  numero_factura: nullableString,
  numero_oc: nullableString,
  fecha_rechazo: nullableDate,
  motivo_rechazo: nullableString,
  consulta_cen: nullableString,
  contenido_cen: nullableString,
  respuesta_cen: nullableString,
  estado_trabajador: nullableString,
  comment: nullableString,
};

function managementCreateData(body: any) {
  const data: Record<string, unknown> = {};
  for (const [key, parser] of Object.entries(fieldParsers)) {
    data[key] = parser(body[key]);
  }
  data.last_activity_at = new Date();
  return data;
}

function managementPatchData(body: any) {
  const data: Record<string, unknown> = {};
  for (const [key, parser] of Object.entries(fieldParsers)) {
    if (hasOwn(body, key)) data[key] = parser(body[key]);
  }

  if (hasOwn(body, "mandante_id")) data.mandante_id = nullableString(body.mandante_id);
  if (hasOwn(body, "group_id")) data.group_id = nullableString(body.group_id);
  if (hasOwn(body, "company_id")) data.company_id = nullableString(body.company_id);
  if (hasOwn(body, "line_id")) data.line_id = nullableString(body.line_id);
  if (hasOwn(body, "line_afp_id")) data.line_afp_id = nullableString(body.line_afp_id);

  data.last_activity_at = new Date();
  return data;
}



function normalizeLegacyRow(row: any, managementType: "LM" | "TP", body: any) {
  return {
    id: row.id,
    management_type: managementType,
    entidad: nullableString(body.entidad),
    rut: nullableString(body.rut),
    estado_gestion: nullableString(body.estado_gestion) || "Pendiente Gestión",
    monto_devolucion: nullableNumber(body.monto_devolucion),
    razon_social: nullableString(body.razon_social),
    numero_solicitud: nullableString(body.numero_solicitud),
    grupo_empresa: nullableString(body.grupo_empresa),
    confirmacion_cc: toBoolean(body.confirmacion_cc),
    confirmacion_poder: toBoolean(body.confirmacion_poder),
    banco: nullableString(body.banco),
    tipo_cuenta: nullableString(body.tipo_cuenta),
    numero_cuenta: nullableString(body.numero_cuenta),
    acceso_portal: nullableString(body.acceso_portal),
    motivo_tipo_exceso: nullableString(body.motivo_tipo_exceso),
    mes_produccion_2026: nullableString(body.mes_produccion_2026),
    mandante: body.mandante_name ? { name: nullableString(body.mandante_name) } : null,
    company: { razon_social: nullableString(body.razon_social), rut: nullableString(body.rut) },
    lineAfp: { afp_name: nullableString(body.entidad) },
    documents: [],
    notes: [],
    activities: [],
  };
}

async function getExistingColumns(tableName: "lm_records" | "tp_records" | "activities") {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    tableName
  );
  return new Set(rows.map((row) => row.column_name));
}


async function getExistingColumnsAny(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    tableName
  );
  return new Set(rows.map((row) => row.column_name));
}

function legacyRowToRecord(row: any, managementType: "LM" | "TP") {
  const mandanteName = row.mandante || row.mandante_name || row.client_name || null;
  const entidad = row.entity || row.entidad || row.afp_name || null;
  const razonSocial = row.business_name || row.razon_social || row.company_name || null;
  const rut = row.rut || row.company_rut || null;

  return {
    id: row.management_id || row.id,
    management_type: managementType,
    mandante_id: row.mandante_id || null,
    group_id: row.group_id || null,
    company_id: row.company_id || null,
    line_id: row.line_id || null,
    line_afp_id: row.line_afp_id || null,
    entidad,
    rut,
    estado_gestion: row.management_status || row.estado_gestion || "Pendiente Gestión",
    monto_devolucion: row.refund_amount ?? row.monto_devolucion ?? null,
    monto_pagado: row.actual_paid_amount ?? row.monto_pagado ?? null,
    monto_cliente: row.client_amount ?? row.monto_cliente ?? null,
    monto_finanfix_solutions: row.finanfix_amount ?? row.monto_finanfix_solutions ?? null,
    monto_real_cliente: row.actual_client_amount ?? row.monto_real_cliente ?? null,
    monto_real_finanfix_solutions: row.actual_finanfix_amount ?? row.monto_real_finanfix_solutions ?? null,
    fee: row.fee ?? null,
    razon_social: razonSocial,
    numero_solicitud: row.request_number || row.numero_solicitud || null,
    grupo_empresa: row.search_group || row.grupo_empresa || null,
    confirmacion_cc: Boolean(row.confirmation_cc ?? row.confirmacion_cc ?? false),
    confirmacion_poder: Boolean(row.confirmation_power ?? row.confirmacion_poder ?? false),
    banco: row.bank_name || row.banco || null,
    tipo_cuenta: row.account_type || row.tipo_cuenta || null,
    numero_cuenta: row.account_number || row.numero_cuenta || null,
    acceso_portal: row.portal_access || row.acceso_portal || null,
    motivo_tipo_exceso: row.excess_type_reason || row.motivo_tipo_exceso || null,
    mes_produccion_2026: row.production_months || row.mes_produccion_2026 || null,
    estado_contrato_cliente: row.client_contract_status || row.estado_contrato_cliente || null,
    fecha_termino_contrato: row.contract_end_date || row.fecha_termino_contrato || null,
    fecha_rechazo: row.rejection_date || row.fecha_rechazo || null,
    motivo_rechazo: row.rejection_reason || row.motivo_rechazo || null,
    envio_afp: row.afp_shipment || row.envio_afp || null,
    fecha_ingreso_afp: row.afp_entry_date || row.fecha_ingreso_afp || null,
    fecha_presentacion_afp: row.afp_submission_date || row.fecha_presentacion_afp || null,
    fecha_pago_afp: row.afp_payment_date || row.fecha_pago_afp || null,
    fecha_factura_finanfix: row.finanfix_invoice_date || row.fecha_factura_finanfix || null,
    fecha_pago_factura_finanfix: row.finanfix_invoice_payment_date || row.fecha_pago_factura_finanfix || null,
    fecha_notificacion_cliente: row.client_notification_date || row.fecha_notificacion_cliente || null,
    numero_factura: row.invoice_number || row.numero_factura || null,
    numero_oc: row.oc_number || row.numero_oc || null,
    consulta_cen: row.cen_query || row.consulta_cen || null,
    contenido_cen: row.cen_content || row.contenido_cen || null,
    respuesta_cen: row.cen_response || row.respuesta_cen || null,
    estado_trabajador: row.worker_status || row.estado_trabajador || null,
    comment: row.comment || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_activity_at: row.last_activity_at || null,
    mandante: mandanteName ? { id: row.mandante_id || null, name: mandanteName } : null,
    group: row.search_group || row.grupo_empresa ? { id: row.group_id || null, name: row.search_group || row.grupo_empresa } : null,
    company: { id: row.company_id || null, razon_social: razonSocial, rut },
    line: row.line_id ? { id: row.line_id, line_type: managementType, name: `${razonSocial || "Empresa"} - ${managementType}` } : null,
    lineAfp: { id: row.line_afp_id || null, afp_name: entidad },
    documents: [],
    notes: [],
    activities: [],
  };
}

async function findLegacyRecordById(id: string) {
  for (const tableName of ["lm_records", "tp_records"] as const) {
    try {
      const columns = await getExistingColumnsAny(tableName);
      const conditions: string[] = [];
      if (columns.has("id")) conditions.push(`id = $1`);
      if (columns.has("management_id")) conditions.push(`management_id = $1`);
      if (!conditions.length) continue;
      const rows = await prisma.$queryRawUnsafe<any[]>(`select * from ${tableName} where ${conditions.join(" or ")} limit 1`, id);
      if (rows?.[0]) return legacyRowToRecord(rows[0], tableName === "tp_records" ? "TP" : "LM");
    } catch (error) {
      console.warn(`No se pudo buscar registro legacy en ${tableName}:`, error);
    }
  }
  return null;
}

function legacyPatchCandidates(body: any) {
  // v14: Solo actualiza campos que vienen explícitamente en el request.
  // Antes se enviaban nulls para campos ausentes y Railway podía rechazar el UPDATE
  // por restricciones NOT NULL en tablas legacy.
  const data: Record<string, unknown> = {};
  const put = (bodyKey: string, column: string, parser: (value: unknown) => unknown = nullableString) => {
    if (hasOwn(body, bodyKey)) data[column] = parser(body[bodyKey]);
  };

  if (hasOwn(body, "mandante_name")) data.mandante = nullableString(body.mandante_name);
  if (hasOwn(body, "mandante")) data.mandante = nullableString(body.mandante);
  put("mandante_id", "mandante_id");
  put("grupo_empresa", "search_group");
  put("razon_social", "business_name");
  put("rut", "rut");
  put("entidad", "entity");
  put("estado_gestion", "management_status");
  put("monto_devolucion", "refund_amount", nullableNumber);
  put("monto_pagado", "actual_paid_amount", nullableNumber);
  put("monto_cliente", "client_amount", nullableNumber);
  put("monto_finanfix_solutions", "finanfix_amount", nullableNumber);
  put("monto_real_cliente", "actual_client_amount", nullableNumber);
  put("monto_real_finanfix_solutions", "actual_finanfix_amount", nullableNumber);
  put("fee", "fee", nullableNumber);
  put("numero_solicitud", "request_number");
  if (hasOwn(body, "confirmacion_cc")) data.confirmation_cc = toBoolean(body.confirmacion_cc);
  if (hasOwn(body, "confirmacion_poder")) data.confirmation_power = toBoolean(body.confirmacion_poder);
  put("banco", "bank_name");
  put("tipo_cuenta", "account_type");
  put("numero_cuenta", "account_number");
  put("acceso_portal", "portal_access");
  put("motivo_tipo_exceso", "excess_type_reason");
  put("mes_produccion_2026", "production_months");
  put("estado_contrato_cliente", "client_contract_status");
  put("fecha_termino_contrato", "contract_end_date", nullableDate);
  put("fecha_rechazo", "rejection_date", nullableDate);
  put("motivo_rechazo", "rejection_reason");
  put("envio_afp", "afp_shipment");
  put("fecha_ingreso_afp", "afp_entry_date", nullableDate);
  put("fecha_presentacion_afp", "afp_submission_date", nullableDate);
  put("fecha_pago_afp", "afp_payment_date", nullableDate);
  put("fecha_factura_finanfix", "finanfix_invoice_date", nullableDate);
  put("fecha_pago_factura_finanfix", "finanfix_invoice_payment_date", nullableDate);
  put("fecha_notificacion_cliente", "client_notification_date", nullableDate);
  put("numero_factura", "invoice_number");
  put("numero_oc", "oc_number");
  put("consulta_cen", "cen_query");
  put("contenido_cen", "cen_content");
  put("respuesta_cen", "cen_response");
  put("estado_trabajador", "worker_status");
  put("comment", "comment");

  data.updated_at = new Date();
  data.last_activity_at = new Date();
  return data;
}

async function updateLegacyRecord(id: string, body: any) {
  for (const tableName of ["lm_records", "tp_records"] as const) {
    const columns = await getExistingColumnsAny(tableName);
    const conditions: string[] = [];
    if (columns.has("id")) conditions.push(`id = $1`);
    if (columns.has("management_id")) conditions.push(`management_id = $1`);
    if (!conditions.length) continue;

    const exists = await prisma.$queryRawUnsafe<any[]>(`select * from ${tableName} where ${conditions.join(" or ")} limit 1`, id);
    if (!exists?.[0]) continue;

    const enrichedBody = { ...body };
    if (hasOwn(body, "mandante_id") && !hasOwn(body, "mandante_name") && !hasOwn(body, "mandante")) {
      enrichedBody.mandante_name = await resolveMandanteName(body);
    }

    const candidateData = legacyPatchCandidates(enrichedBody);
    const entries = Object.entries(candidateData).filter(([column, value]) =>
      columns.has(column) && hasOwn(candidateData, column) && value !== undefined
    );

    if (!entries.length) return legacyRowToRecord(exists[0], tableName === "tp_records" ? "TP" : "LM");

    const setSql = entries.map(([column], index) => `"${column}" = $${index + 2}`).join(", ");
    const values = entries.map(([, value]) => value);
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `update ${tableName} set ${setSql} where ${conditions.join(" or ")} returning *`,
      id,
      ...values
    );

    await createLegacyEditActivity(id, Object.keys(body || {}));
    return legacyRowToRecord(rows[0], tableName === "tp_records" ? "TP" : "LM");
  }

  return null;
}

async function createLegacyEditActivity(recordId: string, fields: string[]) {
  try {
    const columns = await getExistingColumnsAny("activities");
    if (!columns.has("related_module") || !columns.has("related_record_id")) return;

    const data: Record<string, unknown> = {
      id: columns.has("id") ? randomUUID() : undefined,
      related_module: "records",
      related_record_id: recordId,
      activity_type: "EDICIÓN",
      status: "Completada",
      description: fields.length
        ? `Campos modificados en modo Zoho: ${fields.join(", ")}`
        : "Registro actualizado en modo Zoho",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const entries = Object.entries(data).filter(([column, value]) => columns.has(column) && value !== undefined);
    const sqlColumns = entries.map(([column]) => `"${column}"`).join(", ");
    const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
    await prisma.$executeRawUnsafe(
      `insert into activities (${sqlColumns}) values (${placeholders})`,
      ...entries.map(([, value]) => value)
    );
  } catch (error) {
    console.warn("No se pudo crear actividad legacy de edición:", error);
  }
}

async function resolveMandanteName(body: any) {
  const directName = nullableString(body.mandante_name) || nullableString(body.mandante);
  if (directName) return directName;
  const mandanteId = nullableString(body.mandante_id);
  if (!mandanteId) return "Sin mandante";
  try {
    const mandante = await prisma.mandante.findUnique({ where: { id: mandanteId } });
    if (mandante?.name) return mandante.name;
  } catch {}
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`select name from mandantes where id = $1 limit 1`, mandanteId);
    if (rows?.[0]?.name) return rows[0].name;
  } catch {}
  return "Sin mandante";
}

async function insertDynamic(tableName: "lm_records" | "tp_records", candidateData: Record<string, unknown>) {
  const existingColumns = await getExistingColumns(tableName);
  const now = new Date();
  const safeData: Record<string, unknown> = { ...candidateData };

  if (existingColumns.has("id") && (safeData.id === undefined || safeData.id === null || safeData.id === "")) {
    safeData.id = randomUUID();
  }
  if (existingColumns.has("created_at") && safeData.created_at === undefined) safeData.created_at = now;
  if (existingColumns.has("updated_at") && safeData.updated_at === undefined) safeData.updated_at = now;
  if (existingColumns.has("last_activity_at") && safeData.last_activity_at === undefined) safeData.last_activity_at = now;

  const entries = Object.entries(safeData).filter(([column, value]) => existingColumns.has(column) && value !== undefined);

  if (!entries.length) {
    throw new Error(`La tabla ${tableName} no tiene columnas compatibles para crear el registro.`);
  }

  const columns = entries.map(([column]) => `"${column}"`).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `insert into ${tableName} (${columns}) values (${placeholders}) returning id`,
    ...values
  );

  return rows[0];
}

async function createLegacyActivity(recordId: string) {
  try {
    const columns = await getExistingColumns("activities");
    if (!columns.has("related_module") || !columns.has("related_record_id")) return;

    const data: Record<string, unknown> = {
      id: columns.has("id") ? randomUUID() : undefined,
      related_module: "records",
      related_record_id: recordId,
      activity_type: "CREACIÓN",
      status: "Completada",
      description: "Registro de empresa creado en modo compatible Railway",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const entries = Object.entries(data).filter(([column]) => columns.has(column));
    const sqlColumns = entries.map(([column]) => `"${column}"`).join(", ");
    const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
    await prisma.$executeRawUnsafe(
      `insert into activities (${sqlColumns}) values (${placeholders})`,
      ...entries.map(([, value]) => value)
    );
  } catch (activityError) {
    console.warn("No se pudo crear actividad legacy:", activityError);
  }
}

async function createLegacyRecord(body: any) {
  const managementType: "LM" | "TP" = body.management_type === "TP" ? "TP" : "LM";
  const mandanteName = await resolveMandanteName(body);
  const rut = nullableString(body.rut) || `TEMP-${Date.now()}`;
  const razonSocial = nullableString(body.razon_social) || "Empresa sin razón social";
  const estadoGestion = nullableString(body.estado_gestion) || "Pendiente Gestión";
  const now = new Date();

  if (managementType === "TP") {
    const row = await insertDynamic("tp_records", {
      mandante: mandanteName,
      mandante_id: nullableString(body.mandante_id),
      rut,
      entity: nullableString(body.entidad),
      business_name: razonSocial,
      management_status: estadoGestion,
      refund_amount: nullableNumber(body.monto_devolucion),
      request_number: nullableString(body.numero_solicitud),
      search_group: nullableString(body.grupo_empresa),
      bank_name: nullableString(body.banco),
      account_number: nullableString(body.numero_cuenta),
      account_type: nullableString(body.tipo_cuenta),
      portal_access: nullableString(body.acceso_portal),
      production_months: nullableString(body.mes_produccion_2026),
      comment: nullableString(body.comment) || `Registro TP creado desde Registros de empresas. RUT: ${rut}. Razón Social: ${razonSocial}. AFP/Entidad: ${nullableString(body.entidad) || ""}. Estado: ${estadoGestion}. Monto: ${nullableString(body.monto_devolucion) || ""}.`,
      client_contract_status: nullableString(body.estado_contrato_cliente),
      contract_end_date: nullableDate(body.fecha_termino_contrato),
      cen_content: nullableString(body.contenido_cen),
      cen_query: nullableString(body.consulta_cen),
      cen_response: nullableString(body.respuesta_cen),
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    });
    await createLegacyActivity(row.id);
    return normalizeLegacyRow(row, "TP", body);
  }

  const row = await insertDynamic("lm_records", {
    search_group: nullableString(body.grupo_empresa),
    rut,
    entity: nullableString(body.entidad),
    management_status: estadoGestion,
    refund_amount: nullableNumber(body.monto_devolucion),
    confirmation_cc: toBoolean(body.confirmacion_cc),
    confirmation_power: toBoolean(body.confirmacion_poder),
    actual_paid_amount: nullableNumber(body.monto_pagado),
    excess_type_reason: nullableString(body.motivo_tipo_exceso),
    worker_status: nullableString(body.estado_trabajador),
    request_number: nullableString(body.numero_solicitud),
    business_name: razonSocial,
    actual_finanfix_amount: nullableNumber(body.monto_real_finanfix_solutions),
    production_months: nullableString(body.mes_produccion_2026),
    invoice_number: nullableString(body.numero_factura),
    bank_name: nullableString(body.banco),
    account_number: nullableString(body.numero_cuenta),
    account_type: nullableString(body.tipo_cuenta),
    client_contract_status: nullableString(body.estado_contrato_cliente),
    fee: nullableNumber(body.fee),
    client_amount: nullableNumber(body.monto_cliente),
    finanfix_amount: nullableNumber(body.monto_finanfix_solutions),
    actual_client_amount: nullableNumber(body.monto_real_cliente),
    contract_end_date: nullableDate(body.fecha_termino_contrato),
    rejection_date: nullableDate(body.fecha_rechazo),
    comment: nullableString(body.comment),
    oc_number: nullableString(body.numero_oc),
    afp_shipment: nullableString(body.envio_afp),
    afp_entry_date: nullableDate(body.fecha_ingreso_afp),
    mandante: mandanteName,
    mandante_id: nullableString(body.mandante_id),
    portal_access: nullableString(body.acceso_portal),
    cen_response: nullableString(body.respuesta_cen),
    cen_query: nullableString(body.consulta_cen),
    request_entry_month: nullableString(body.mes_ingreso_solicitud),
    cen_content: nullableString(body.contenido_cen),
    afp_payment_date: nullableDate(body.fecha_pago_afp),
    afp_submission_date: nullableDate(body.fecha_presentacion_afp),
    finanfix_invoice_date: nullableDate(body.fecha_factura_finanfix),
    finanfix_invoice_payment_date: nullableDate(body.fecha_pago_factura_finanfix),
    client_notification_date: nullableDate(body.fecha_notificacion_cliente),
    last_activity_at: now,
    created_at: now,
    updated_at: now,
  });

  await createLegacyActivity(row.id);
  return normalizeLegacyRow(row, "LM", body);
}

const recordInclude = {
  mandante: true,
  group: true,
  company: true,
  line: true,
  lineAfp: true,
  documents: { orderBy: { created_at: "desc" as const } },
  notes: { orderBy: { created_at: "desc" as const } },
  activities: { orderBy: { created_at: "desc" as const } },
};

async function ensureRecordContext(body: any) {
  const managementType = body.management_type === "TP" ? "TP" : "LM";
  const requestedAfpId = isAutoLineAfpValue(body.line_afp_id) ? null : nullableString(body.line_afp_id);

  if (requestedAfpId) {
    const lineAfp = await prisma.managementLineAfp.findUnique({
      where: { id: requestedAfpId },
      include: { line: true },
    });

    if (lineAfp?.line) {
      return {
        mandante_id: lineAfp.line.mandante_id,
        group_id: lineAfp.line.group_id || null,
        company_id: lineAfp.line.company_id,
        line_id: lineAfp.line.id,
        line_afp_id: lineAfp.id,
      };
    }
  }

  let mandante = null;
  const requestedMandanteId = nullableString(body.mandante_id);
  if (requestedMandanteId) {
    mandante = await prisma.mandante.findUnique({ where: { id: requestedMandanteId } });
  }

  if (!mandante) {
    const mandanteName = await resolveMandanteName(body);
    mandante = await prisma.mandante.upsert({
      where: { name: mandanteName },
      update: {},
      create: { name: mandanteName },
    });
  }

  const razonSocial = nullableString(body.razon_social) || "Empresa sin razón social";
  const rut = nullableString(body.rut) || `TEMP-${Date.now()}`;
  const afpName = nullableString(body.entidad) || "AFP Capital";
  const groupName = nullableString(body.grupo_empresa) || "Grupo general";

  const group = await prisma.companyGroup.upsert({
    where: {
      mandante_id_group_type_name: {
        mandante_id: mandante.id,
        group_type: managementType as any,
        name: groupName,
      },
    },
    update: {},
    create: {
      mandante_id: mandante.id,
      group_type: managementType as any,
      name: groupName,
    },
  });

  const company = await prisma.company.upsert({
    where: { rut },
    update: {
      razon_social: razonSocial,
      mandante_id: mandante.id,
      group_id: group.id,
    },
    create: {
      mandante_id: mandante.id,
      group_id: group.id,
      razon_social: razonSocial,
      rut,
    },
  });

  let line = await prisma.managementLine.findFirst({
    where: {
      mandante_id: mandante.id,
      group_id: group.id,
      company_id: company.id,
      line_type: managementType as any,
    },
  });

  if (!line) {
    line = await prisma.managementLine.create({
      data: {
        mandante_id: mandante.id,
        group_id: group.id,
        company_id: company.id,
        line_type: managementType as any,
        name: `${razonSocial} - ${managementType}`,
      },
    });
  }

  const lineAfp = await prisma.managementLineAfp.upsert({
    where: {
      line_id_afp_name: {
        line_id: line.id,
        afp_name: afpName,
      },
    },
    update: {},
    create: {
      line_id: line.id,
      afp_name: afpName,
      current_status: nullableString(body.estado_gestion) || "Pendiente Gestión",
    },
  });

  return {
    mandante_id: mandante.id,
    group_id: group.id,
    company_id: company.id,
    line_id: line.id,
    line_afp_id: lineAfp.id,
  };
}

recordsRouter.get("/", async (req, res, next) => {
  try {
    const mandanteId =
      typeof req.query.mandante_id === "string"
        ? req.query.mandante_id
        : undefined;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const where: any = {};

    // 🔥 SOLO agregamos si existe (clave)
    if (mandanteId) {
      where.mandante_id = mandanteId;
    }

    if (search) {
      where.OR = [
        { razon_social: { contains: search, mode: "insensitive" } },
        { rut: { contains: search, mode: "insensitive" } },
        { entidad: { contains: search, mode: "insensitive" } },
        { estado_gestion: { contains: search, mode: "insensitive" } },
        { numero_solicitud: { contains: search, mode: "insensitive" } },
        { grupo_empresa: { contains: search, mode: "insensitive" } },
      ];
    }

    try {
      const rows = await prisma.management.findMany({
        where,
        include: { mandante: true, group: true, company: true, line: true, lineAfp: true, documents: true },
        orderBy: { created_at: "desc" },
      });
      return res.json(rows);
    } catch (managementError: any) {
      console.error("ERROR /api/records usando managements:", managementError?.message || managementError);
      const [lmRows, tpRows] = await Promise.all([
        prisma.lmRecord.findMany({ orderBy: { created_at: "desc" }, take: 500 }),
        prisma.tpRecord.findMany({ orderBy: { created_at: "desc" }, take: 500 }),
      ]);
      const legacyRows = [
        ...lmRows.map((row: any) => ({ id: row.management_id || row.id, management_type: "LM", entidad: row.entity, rut: row.rut, estado_gestion: row.management_status, monto_devolucion: row.refund_amount, razon_social: row.business_name, numero_solicitud: row.request_number, grupo_empresa: row.search_group, confirmacion_cc: row.confirmation_cc, confirmacion_poder: row.confirmation_power, banco: row.bank_name, tipo_cuenta: row.account_type, numero_cuenta: row.account_number, acceso_portal: row.portal_access, motivo_tipo_exceso: row.motivo_tipo_exceso || row.excess_type_reason, mes_produccion_2026: row.mes_produccion_2026, mandante: row.mandante ? { name: row.mandante } : null, company: { razon_social: row.business_name, rut: row.rut }, lineAfp: { afp_name: row.entity }, documents: [] })),
        ...tpRows.map((row: any) => ({ id: row.management_id || row.id, management_type: "TP", entidad: row.entity, rut: row.rut, estado_gestion: row.management_status, monto_devolucion: row.refund_amount, razon_social: row.business_name, numero_solicitud: row.request_number, grupo_empresa: row.search_group, banco: row.bank_name, tipo_cuenta: row.account_type, numero_cuenta: row.account_number, acceso_portal: row.acceso_portal || row.portal_access, mes_produccion_2026: row.mes_produccion_2026, mandante: row.mandante ? { name: row.mandante } : null, company: { razon_social: row.business_name, rut: row.rut }, lineAfp: { afp_name: row.entity }, documents: [] })),
      ];
      return res.json(legacyRows);
    }
  } catch (error: any) {
    console.error("ERROR FINAL /api/records:", error?.message || error);
    res.status(500).json({ message: "No se pudieron cargar los registros de empresas.", detail: process.env.NODE_ENV === "production" ? undefined : String(error?.message || error) });
  }
});


recordsRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  try {
    try {
      const row = await prisma.management.findUnique({
        where: { id },
        include: recordInclude,
      });
      if (row) return res.json(row);
    } catch (managementError: any) {
      console.error("ERROR /api/records/:id usando managements. Se buscará modo compatible:", managementError?.message || managementError);
    }

    const legacyRow = await findLegacyRecordById(id);
    if (legacyRow) return res.json(legacyRow);

    return res.status(404).json({ message: "Registro no encontrado" });
  } catch (error: any) {
    console.error("ERROR FINAL /api/records/:id:", error?.message || error);
    return res.status(500).json({
      message: "No se pudo cargar la ficha del registro.",
      detail: String(error?.message || error),
    });
  }
});

recordsRouter.post("/", async (req, res) => {
  const body = cleanRecordBody(req.body);

  try {
    try {
      const context = await ensureRecordContext(body);

      const row = await prisma.management.create({
        data: {
          ...context,
          ...managementCreateData(body),
        } as any,
        include: recordInclude,
      });

      try {
        await prisma.activity.create({
          data: {
            related_module: "records",
            related_record_id: row.id,
            management_id: row.id,
            activity_type: "CREACIÓN",
            status: "Completada",
            description: "Registro de empresa creado",
          },
        });
      } catch (activityError) {
        console.warn("Registro creado, pero no se pudo crear actividad:", activityError);
      }

      return res.status(201).json(row);
    } catch (managementError: any) {
      console.error("ERROR /api/records POST usando managements. Se usará modo compatible:", managementError?.message || managementError);
      const legacyRow = await createLegacyRecord(body);
      return res.status(201).json(legacyRow);
    }
  } catch (error: any) {
    console.error("ERROR FINAL /api/records POST:", error?.message || error);
    return res.status(500).json({
      message: "No se pudo crear el registro de empresa.",
      detail: String(error?.message || error),
      hint: "Revisa en Railway que existan las tablas managements o lm_records/tp_records y que DATABASE_URL apunte a la base correcta.",
    });
  }
});

recordsRouter.put("/:id", async (req, res) => {
  const id = String(req.params.id);
  const body = cleanRecordBody(req.body);

  try {
    try {
      const previous = await prisma.management.findUnique({ where: { id } });

      if (previous) {
        const patch = managementPatchData(body);

        // v14: Si cambia el mandante, reconstruimos también grupo/empresa/línea/AFP.
        // Así evitamos dejar relaciones obligatorias en null y se mantiene la lógica tipo Zoho.
        if (hasOwn(body, "mandante_id") || hasOwn(body, "mandante_name") || hasOwn(body, "mandante")) {
          const context = await ensureRecordContext({
            ...previous,
            ...body,
          });
          patch.mandante_id = context.mandante_id;
          patch.group_id = context.group_id;
          patch.company_id = context.company_id;
          patch.line_id = context.line_id;
          patch.line_afp_id = context.line_afp_id;
        }

        const changedDescriptions = Object.entries(body || {})
          .filter(([key]) => key in fieldParsers || ["mandante_id", "group_id", "company_id", "line_id", "line_afp_id"].includes(key))
          .map(([key, newValue]) => `${key}: "${String((previous as any)[key] ?? "")}" → "${String(newValue ?? "")}"`);

        const row = await prisma.management.update({
          where: { id },
          data: patch as any,
          include: recordInclude,
        });

        try {
          await prisma.activity.create({
            data: {
              related_module: "records",
              related_record_id: row.id,
              management_id: row.id,
              activity_type: "EDICIÓN",
              status: "Completada",
              description: changedDescriptions.length
                ? `Campos modificados: ${changedDescriptions.join("; ")}`
                : "Registro actualizado desde modo Zoho",
            },
          });
        } catch (activityError) {
          console.warn("Registro editado, pero no se pudo crear actividad:", activityError);
        }

        return res.json(row);
      }
    } catch (managementError: any) {
      console.error("ERROR /api/records PUT usando managements. Se usará modo compatible:", managementError?.message || managementError);
    }

    const legacyRow = await updateLegacyRecord(id, body);
    if (legacyRow) return res.json(legacyRow);

    return res.status(404).json({ message: "Registro no encontrado" });
  } catch (error: any) {
    console.error("ERROR FINAL /api/records PUT:", error?.message || error);
    return res.status(500).json({
      message: "No se pudo actualizar el registro de empresa.",
      detail: String(error?.message || error),
    });
  }
});

recordsRouter.post("/:id/notes", async (req, res, next) => {
  try {
    const recordId = String(req.params.id);
    const note = await prisma.note.create({
      data: {
        related_module: "records",
        related_record_id: recordId,
        management_id: recordId,
        content: String(req.body.content || ""),
      },
    });

    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: recordId,
        management_id: recordId,
        activity_type: "NOTA",
        status: "Completada",
        description: "Nota agregada al registro",
      },
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

recordsRouter.post("/:id/documents/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Archivo requerido" });

    const recordId = String(req.params.id);
    const fileUrl = `/storage/management-documents/${req.file.filename}`;
    const doc = await prisma.document.create({
      data: {
        management_id: recordId,
        related_module: "records",
        related_record_id: recordId,
        category: mapDocumentCategory(req.body.category) as any,
        file_name: req.file.originalname,
        file_url: fileUrl,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by_id: req.body.uploaded_by_id || null,
      },
    });

    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: recordId,
        management_id: recordId,
        activity_type: "DOCUMENTO",
        status: "Completada",
        description: `Documento cargado: ${req.file.originalname}`,
      },
    });

    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
});

export default recordsRouter;
