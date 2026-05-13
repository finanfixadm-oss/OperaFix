import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "../config/prisma.js";

const importRecordsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } });

type ManagementType = "LM" | "TP";
type ValidationStatus = "OK" | "ADVERTENCIA" | "ERROR";

type NormalizedImportRow = {
  rowNumber: number;
  management_type: ManagementType;
  mandante: string | null;
  estado_contrato_cliente: string | null;
  fecha_termino_contrato: string | null;
  motivo_tipo_exceso: string | null;
  mes_produccion_2026: string | null;
  mes_ingreso_solicitud: string | null;
  entidad: string | null;
  envio_afp: string | null;
  estado_gestion: string | null;
  fecha_presentacion_afp: string | null;
  fecha_ingreso_afp: string | null;
  fecha_pago_afp: string | null;
  numero_solicitud: string | null;
  grupo_empresa: string | null;
  razon_social: string | null;
  rut: string | null;
  direccion: string | null;
  monto_devolucion: number | null;
  monto_pagado: number | null;
  monto_cliente: number | null;
  monto_finanfix_solutions: number | null;
  monto_real_cliente: number | null;
  monto_real_finanfix_solutions: number | null;
  fee: number | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  confirmacion_cc: boolean;
  confirmacion_poder: boolean;
  acceso_portal: string | null;
  facturado_finanfix: string | null;
  facturado_cliente: string | null;
  fecha_factura_finanfix: string | null;
  fecha_pago_factura_finanfix: string | null;
  fecha_notificacion_cliente: string | null;
  numero_factura: string | null;
  numero_oc: string | null;
  fecha_rechazo: string | null;
  motivo_rechazo: string | null;
  consulta_cen: string | null;
  contenido_cen: string | null;
  respuesta_cen: string | null;
  estado_trabajador: string | null;
  comment: string | null;
  validation_status: ValidationStatus;
  validation_messages: string[];
  duplicate_key: string;
  is_duplicate_in_file: boolean;
  exists_in_database: boolean;
};

type ImportSession = {
  id: string;
  createdAt: number;
  fileName: string;
  rows: NormalizedImportRow[];
  headers: string[];
  mappedColumns: Array<{ header: string; field: string; label: string }>;
  unmappedHeaders: string[];
};

type FieldDef = {
  field: keyof NormalizedImportRow;
  label: string;
  type: "text" | "number" | "money" | "boolean" | "date" | "enum";
  aliases: string[];
  managementColumn?: string;
  lmColumn?: string;
  tpColumn?: string;
};

const importSessions = new Map<string, ImportSession>();
const SESSION_TTL_MS = 1000 * 60 * 45;

const CRM_IMPORT_FIELDS: FieldDef[] = [
  { field: "mandante", label: "Mandante", type: "text", aliases: ["mandante", "cliente", "nombre mandante"] },
  { field: "management_type", label: "Tipo", type: "enum", aliases: ["tipo", "gestion", "gestion tipo", "tipo gestion", "lm tp"], managementColumn: "management_type" },
  { field: "mes_produccion_2026", label: "Mes de producción", type: "text", aliases: ["mes de produccion", "mes produccion", "mes de produccion 2026", "mes produccion 2026"], managementColumn: "mes_produccion_2026", lmColumn: "mes_produccion_2026", tpColumn: "mes_produccion_2026" },
  { field: "mes_ingreso_solicitud", label: "Mes de ingreso solicitud", type: "text", aliases: ["mes de ingreso solicitud", "mes ingreso solicitud"], managementColumn: "mes_ingreso_solicitud", lmColumn: "mes_ingreso_solicitud", tpColumn: "mes_ingreso_solicitud" },
  { field: "acceso_portal", label: "Acceso portal", type: "enum", aliases: ["acceso portal", "portal"], managementColumn: "acceso_portal", lmColumn: "portal_access", tpColumn: "portal_access" },
  { field: "envio_afp", label: "Envío AFP", type: "enum", aliases: ["envio afp", "envío afp"], managementColumn: "envio_afp", lmColumn: "envio_afp", tpColumn: "envio_afp" },
  { field: "estado_contrato_cliente", label: "Estado contrato con cliente", type: "enum", aliases: ["estado contrato con cliente", "estado contrato cliente"], managementColumn: "estado_contrato_cliente", lmColumn: "estado_contrato_cliente", tpColumn: "estado_contrato_cliente" },
  { field: "fecha_termino_contrato", label: "Fecha término de contrato", type: "date", aliases: ["fecha termino de contrato", "fecha término de contrato", "fecha termino contrato"], managementColumn: "fecha_termino_contrato", lmColumn: "fecha_termino_contrato", tpColumn: "fecha_termino_contrato" },
  { field: "estado_gestion", label: "Estado Gestión", type: "enum", aliases: ["estado gestion", "estado gestión", "estado", "gestion", "gestión"], managementColumn: "estado_gestion", lmColumn: "management_status", tpColumn: "management_status" },
  { field: "numero_solicitud", label: "N° Solicitud", type: "text", aliases: ["n solicitud", "n° solicitud", "numero solicitud", "nro solicitud", "solicitud", "ticket", "caso"], managementColumn: "numero_solicitud", lmColumn: "request_number", tpColumn: "request_number" },
  { field: "motivo_rechazo", label: "Motivo del rechazo/anulación", type: "text", aliases: ["motivo del rechazo", "motivo rechazo", "motivo de rechazo", "motivo anulacion", "motivo anulación"], managementColumn: "motivo_rechazo", lmColumn: "motivo_rechazo", tpColumn: "motivo_rechazo" },
  { field: "fecha_rechazo", label: "Fecha Rechazo", type: "date", aliases: ["fecha rechazo"], managementColumn: "fecha_rechazo", lmColumn: "fecha_rechazo", tpColumn: "fecha_rechazo" },
  { field: "grupo_empresa", label: "Buscar Grupo", type: "text", aliases: ["buscar grupo", "grupo", "grupo empresa", "nombre grupo", "grupo de empresa"], managementColumn: "grupo_empresa", lmColumn: "search_group", tpColumn: "search_group" },
  { field: "razon_social", label: "Razón Social", type: "text", aliases: ["razon social", "razón social", "empresa", "nombre empresa", "rs"], managementColumn: "razon_social", lmColumn: "business_name", tpColumn: "business_name" },
  { field: "rut", label: "RUT", type: "text", aliases: ["rut", "rut empresa", "rut rs"], managementColumn: "rut", lmColumn: "rut", tpColumn: "rut" },
  { field: "direccion", label: "Dirección", type: "text", aliases: ["direccion", "dirección"], managementColumn: "direccion", lmColumn: "direccion", tpColumn: "direccion" },
  { field: "entidad", label: "Entidad (AFP)", type: "enum", aliases: ["entidad", "afp", "entidad afp", "entidad / afp", "institucion", "institución"], managementColumn: "entidad", lmColumn: "entity", tpColumn: "entity" },
  { field: "banco", label: "Banco", type: "enum", aliases: ["banco"], managementColumn: "banco", lmColumn: "bank_name", tpColumn: "bank_name" },
  { field: "tipo_cuenta", label: "Tipo de Cuenta", type: "enum", aliases: ["tipo de cuenta", "tipo cuenta"], managementColumn: "tipo_cuenta", lmColumn: "account_type", tpColumn: "account_type" },
  { field: "numero_cuenta", label: "Número cuenta", type: "text", aliases: ["numero cuenta", "número cuenta", "n cuenta", "cuenta"], managementColumn: "numero_cuenta", lmColumn: "account_number", tpColumn: "account_number" },
  { field: "confirmacion_cc", label: "Confirmación CC", type: "boolean", aliases: ["confirmacion cc", "confirmación cc", "cc", "cuenta corriente"], managementColumn: "confirmacion_cc", lmColumn: "confirmation_cc", tpColumn: "confirmation_cc" },
  { field: "confirmacion_poder", label: "Confirmación Poder", type: "boolean", aliases: ["confirmacion poder", "confirmación poder", "poder"], managementColumn: "confirmacion_poder", lmColumn: "confirmation_power", tpColumn: "confirmation_power" },
  { field: "consulta_cen", label: "Consulta CEN", type: "enum", aliases: ["consulta cen"], managementColumn: "consulta_cen", lmColumn: "consulta_cen", tpColumn: "consulta_cen" },
  { field: "contenido_cen", label: "Contenido CEN", type: "enum", aliases: ["contenido cen"], managementColumn: "contenido_cen", lmColumn: "contenido_cen", tpColumn: "contenido_cen" },
  { field: "respuesta_cen", label: "Respuesta CEN", type: "enum", aliases: ["respuesta cen"], managementColumn: "respuesta_cen", lmColumn: "respuesta_cen", tpColumn: "respuesta_cen" },
  { field: "estado_trabajador", label: "Estado Trabajador", type: "enum", aliases: ["estado trabajador"], managementColumn: "estado_trabajador", lmColumn: "worker_status", tpColumn: "worker_status" },
  { field: "motivo_tipo_exceso", label: "Motivo Tipo de exceso", type: "enum", aliases: ["motivo tipo de exceso", "motivo (tipo de exceso)", "tipo de exceso", "motivo", "motivo tipo exceso"], managementColumn: "motivo_tipo_exceso", lmColumn: "motivo_tipo_exceso", tpColumn: "motivo_tipo_exceso" },
  { field: "monto_devolucion", label: "Monto Devolución", type: "money", aliases: ["monto devolucion", "monto devolución", "monto de devolucion", "monto de devolución", "monto recuperacion", "monto recuperar", "devolucion", "monto"], managementColumn: "monto_devolucion", lmColumn: "refund_amount", tpColumn: "refund_amount" },
  { field: "monto_pagado", label: "Monto Real Pagado", type: "money", aliases: ["monto real pagado", "monto pagado", "pagado entidad"], managementColumn: "monto_pagado", lmColumn: "actual_paid_amount", tpColumn: "actual_paid_amount" },
  { field: "monto_cliente", label: "Monto cliente", type: "money", aliases: ["monto cliente"], managementColumn: "monto_cliente", lmColumn: "monto_cliente", tpColumn: "monto_cliente" },
  { field: "monto_finanfix_solutions", label: "Monto Finanfix", type: "money", aliases: ["monto finanfix", "monto finanfix solutions"], managementColumn: "monto_finanfix_solutions", lmColumn: "monto_finanfix_solutions", tpColumn: "monto_finanfix_solutions" },
  { field: "monto_real_cliente", label: "Monto real cliente", type: "money", aliases: ["monto real cliente"], managementColumn: "monto_real_cliente", lmColumn: "monto_real_cliente", tpColumn: "monto_real_cliente" },
  { field: "monto_real_finanfix_solutions", label: "Monto real Finanfix Solutions", type: "money", aliases: ["monto real finanfix", "monto real finanfix solutions"], managementColumn: "monto_real_finanfix_solutions", lmColumn: "monto_real_finanfix_solutions", tpColumn: "monto_real_finanfix_solutions" },
  { field: "fee", label: "FEE", type: "number", aliases: ["fee", "fee %", "porcentaje"], managementColumn: "fee", lmColumn: "fee", tpColumn: "fee" },
  { field: "facturado_cliente", label: "Facturado cliente", type: "enum", aliases: ["facturado cliente"], managementColumn: "facturado_cliente", lmColumn: "facturado_cliente", tpColumn: "facturado_cliente" },
  { field: "facturado_finanfix", label: "Facturado Finanfix", type: "enum", aliases: ["facturado finanfix"], managementColumn: "facturado_finanfix", lmColumn: "facturado_finanfix", tpColumn: "facturado_finanfix" },
  { field: "fecha_pago_afp", label: "Fecha Pago AFP", type: "date", aliases: ["fecha pago afp", "pago afp"], managementColumn: "fecha_pago_afp", lmColumn: "fecha_pago_afp", tpColumn: "fecha_pago_afp" },
  { field: "fecha_presentacion_afp", label: "Fecha Presentación AFP", type: "date", aliases: ["fecha presentacion afp", "fecha presentación afp", "fecha presentacion"], managementColumn: "fecha_presentacion_afp", lmColumn: "fecha_presentacion_afp", tpColumn: "fecha_presentacion_afp" },
  { field: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date", aliases: ["fecha ingreso afp", "ingreso afp"], managementColumn: "fecha_ingreso_afp", lmColumn: "fecha_ingreso_afp", tpColumn: "fecha_ingreso_afp" },
  { field: "fecha_factura_finanfix", label: "Fecha Factura Finanfix", type: "date", aliases: ["fecha factura finanfix", "fecha factura"], managementColumn: "fecha_factura_finanfix", lmColumn: "fecha_factura_finanfix", tpColumn: "fecha_factura_finanfix" },
  { field: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date", aliases: ["fecha pago factura finanfix", "pago factura finanfix", "fecha pago factura"], managementColumn: "fecha_pago_factura_finanfix", lmColumn: "fecha_pago_factura_finanfix", tpColumn: "fecha_pago_factura_finanfix" },
  { field: "fecha_notificacion_cliente", label: "Fecha notificación cliente", type: "date", aliases: ["fecha notificacion cliente", "fecha notificación cliente", "notificacion cliente"], managementColumn: "fecha_notificacion_cliente", lmColumn: "fecha_notificacion_cliente", tpColumn: "fecha_notificacion_cliente" },
  { field: "numero_factura", label: "N° Factura", type: "text", aliases: ["n factura", "n° factura", "numero factura", "factura"], managementColumn: "numero_factura", lmColumn: "numero_factura", tpColumn: "numero_factura" },
  { field: "numero_oc", label: "N° OC", type: "text", aliases: ["n oc", "n° oc", "numero oc", "oc", "orden compra", "orden de compra"], managementColumn: "numero_oc", lmColumn: "numero_oc", tpColumn: "numero_oc" },
  { field: "comment", label: "Comentario", type: "text", aliases: ["comentario", "comment", "observacion", "observación"], managementColumn: "comment", lmColumn: "comment", tpColumn: "comment" },
];

const FIELD_BY_INTERNAL = new Map(CRM_IMPORT_FIELDS.map((def) => [def.field, def]));

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of importSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) importSessions.delete(id);
  }
}

function normHeader(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°#]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function detectHeaderAlias(header: string): keyof NormalizedImportRow | undefined {
  const normalized = normHeader(header);
  const compact = normalized.replace(/\s/g, "");

  for (const field of CRM_IMPORT_FIELDS) {
    const candidates = [field.label, ...field.aliases].flatMap((item) => {
      const n = normHeader(item);
      return [n, n.replace(/\s/g, "")];
    });
    if (candidates.includes(normalized) || candidates.includes(compact)) return field.field;
  }

  const tokenMatches: Array<[string[], keyof NormalizedImportRow]> = [
    [["razon", "social"], "razon_social"],
    [["rut"], "rut"],
    [["mandante"], "mandante"],
    [["estado", "gestion"], "estado_gestion"],
    [["monto", "devolucion"], "monto_devolucion"],
    [["monto", "real", "pagado"], "monto_pagado"],
    [["numero", "solicitud"], "numero_solicitud"],
    [["solicitud"], "numero_solicitud"],
    [["entidad"], "entidad"],
    [["afp"], "entidad"],
    [["grupo"], "grupo_empresa"],
    [["confirmacion", "cc"], "confirmacion_cc"],
    [["confirmacion", "poder"], "confirmacion_poder"],
    [["fecha", "pago", "afp"], "fecha_pago_afp"],
    [["fecha", "presentacion", "afp"], "fecha_presentacion_afp"],
    [["fecha", "ingreso", "afp"], "fecha_ingreso_afp"],
    [["fecha", "notificacion", "cliente"], "fecha_notificacion_cliente"],
  ];

  for (const [tokens, key] of tokenMatches) {
    if (tokens.every((token) => normalized.includes(token))) return key;
  }

  return undefined;
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizeMandanteName(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  return text.replace(/\s+/g, " ").trim();
}

function numberValue(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value)
    .replace(/\$/g, "")
    .replace(/CLP/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ["si", "true", "1", "x", "ok", "yes", "y", "vigente", "confirmado"].includes(text);
}

function excelDateToIso(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const text = String(value).trim();
  if (!text) return null;
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  const match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    const [, dd, mm, yy] = match;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    const parsed = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function normalizeRutWithHyphen(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  const cleaned = text.replace(/[^0-9Kk]/g, "").toUpperCase();
  if (cleaned.length < 2) return text.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
}

function rutValue(value: unknown) {
  return normalizeRutWithHyphen(value);
}

function validateRutDv(rut: string) {
  const cleaned = rut.replace(/[^0-9K]/gi, "").toUpperCase();
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? "0" : res === 10 ? "K" : String(res);
  return expected === dv;
}

function detectType(motivo: string | null): ManagementType {
  const text = (motivo || "").toLowerCase();
  if (text.includes("trabajo") || text.includes("tp")) return "TP";
  return "LM";
}

function makeKey(row: Pick<NormalizedImportRow, "mandante" | "rut" | "entidad" | "numero_solicitud" | "management_type">) {
  return [row.management_type, row.mandante || "", row.rut || "", row.entidad || "", row.numero_solicitud || ""]
    .join("|")
    .toUpperCase();
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function getTargetValue(target: Record<string, unknown>, field: keyof NormalizedImportRow) {
  return target[field as string];
}

function normalizeByField(field: keyof NormalizedImportRow, value: unknown) {
  const def = FIELD_BY_INTERNAL.get(field);
  if (!def) return stringValue(value);
  if (def.type === "date") return excelDateToIso(value);
  if (def.type === "money" || def.type === "number") return numberValue(value);
  if (def.type === "boolean") return boolValue(value);
  if (field === "rut") return rutValue(value);
  if (field === "mandante") return normalizeMandanteName(value);
  return stringValue(value);
}

function validate(row: NormalizedImportRow) {
  const messages: string[] = [];
  if (!row.mandante) messages.push("Falta Mandante");
  if (!row.razon_social) messages.push("Falta Razón Social");
  if (!row.rut) messages.push("Falta RUT");
  if (!row.entidad && row.management_type === "LM") messages.push("Falta Entidad / AFP");
  if (row.monto_devolucion === null) messages.push("Monto Devolución vacío o inválido");
  if (row.rut && !/^\d{6,9}-[0-9K]$/i.test(row.rut)) messages.push("RUT normalizado con formato no estándar");
  if (row.rut && /^\d{6,9}-[0-9K]$/i.test(row.rut) && !validateRutDv(row.rut)) messages.push("RUT con dígito verificador inválido");
  row.validation_messages = messages;
  row.validation_status = messages.some((m) => m.includes("Falta RUT") || m.includes("Falta Mandante") || m.includes("Falta Razón"))
    ? "ERROR"
    : messages.length
      ? "ADVERTENCIA"
      : "OK";
}

function emptyRow(rowNumber: number): NormalizedImportRow {
  return {
    rowNumber,
    management_type: "LM",
    mandante: null,
    estado_contrato_cliente: null,
    fecha_termino_contrato: null,
    motivo_tipo_exceso: null,
    mes_produccion_2026: null,
    mes_ingreso_solicitud: null,
    entidad: null,
    envio_afp: null,
    estado_gestion: null,
    fecha_presentacion_afp: null,
    fecha_ingreso_afp: null,
    fecha_pago_afp: null,
    numero_solicitud: null,
    grupo_empresa: null,
    razon_social: null,
    rut: null,
    direccion: null,
    monto_devolucion: null,
    monto_pagado: null,
    monto_cliente: null,
    monto_finanfix_solutions: null,
    monto_real_cliente: null,
    monto_real_finanfix_solutions: null,
    fee: null,
    banco: null,
    tipo_cuenta: null,
    numero_cuenta: null,
    confirmacion_cc: false,
    confirmacion_poder: false,
    acceso_portal: null,
    facturado_finanfix: null,
    facturado_cliente: null,
    fecha_factura_finanfix: null,
    fecha_pago_factura_finanfix: null,
    fecha_notificacion_cliente: null,
    numero_factura: null,
    numero_oc: null,
    fecha_rechazo: null,
    motivo_rechazo: null,
    consulta_cen: null,
    contenido_cen: null,
    respuesta_cen: null,
    estado_trabajador: null,
    comment: null,
    validation_status: "OK",
    validation_messages: [],
    duplicate_key: "",
    is_duplicate_in_file: false,
    exists_in_database: false,
  };
}

function normalizeRow(raw: Record<string, unknown>, rowNumber: number, headerMap: Record<string, keyof NormalizedImportRow>): NormalizedImportRow {
  const row = emptyRow(rowNumber);
  const target: Record<string, unknown> = {};

  for (const [header, value] of Object.entries(raw)) {
    const key = headerMap[normHeader(header)];
    if (key) target[key] = value;
  }

  for (const def of CRM_IMPORT_FIELDS) {
    const value = getTargetValue(target, def.field);
    if (value !== undefined) (row as any)[def.field] = normalizeByField(def.field, value);
  }

  row.management_type = detectType(row.motivo_tipo_exceso);
  row.estado_gestion = row.estado_gestion || "Pendiente Gestión";
  row.duplicate_key = makeKey(row);
  validate(row);
  return row;
}

function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("El Excel no tiene hojas para importar.");
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }) as Record<string, unknown>[];
  const headers = Object.keys(rawRows[0] || {});
  const headerMap: Record<string, keyof NormalizedImportRow> = {};
  const mappedColumns: Array<{ header: string; field: string; label: string }> = [];
  const unmappedHeaders: string[] = [];

  for (const header of headers) {
    const alias = detectHeaderAlias(header);
    if (alias) {
      headerMap[normHeader(header)] = alias;
      mappedColumns.push({ header, field: String(alias), label: FIELD_BY_INTERNAL.get(alias)?.label || String(alias) });
    } else {
      unmappedHeaders.push(header);
    }
  }

  const rows = rawRows.map((raw, index) => normalizeRow(raw, index + 2, headerMap));
  const seen = new Map<string, number>();

  for (const row of rows) {
    const count = seen.get(row.duplicate_key) || 0;
    seen.set(row.duplicate_key, count + 1);
    if (count > 0) {
      row.is_duplicate_in_file = true;
      row.validation_messages.push("Posible duplicado dentro del archivo");
      if (row.validation_status === "OK") row.validation_status = "ADVERTENCIA";
    }
  }

  return { sheetName, headers, rows, mappedColumns, unmappedHeaders };
}

async function markDatabaseDuplicates(rows: NormalizedImportRow[]) {
  const candidates = rows.filter((r) => r.rut || r.numero_solicitud);
  if (!candidates.length) return;
  const rutList = [...new Set(candidates.map((r) => r.rut).filter(Boolean))] as string[];
  const requestList = [...new Set(candidates.map((r) => r.numero_solicitud).filter(Boolean))] as string[];
  const existing = new Set<string>();

  for (const rutChunk of chunkArray(rutList, 500)) {
    if (!rutChunk.length) continue;
    const [lm, tp] = await Promise.all([
      prisma.lmRecord.findMany({ where: { rut: { in: rutChunk } }, select: { rut: true, request_number: true, entity: true, mandante: true }, take: 10000 }),
      prisma.tpRecord.findMany({ where: { rut: { in: rutChunk } }, select: { rut: true, request_number: true, entity: true, mandante: true }, take: 10000 }),
    ]);
    for (const item of lm) existing.add(makeKey({ management_type: "LM", mandante: item.mandante || null, rut: rutValue(item.rut), entidad: item.entity || null, numero_solicitud: item.request_number || null }));
    for (const item of tp) existing.add(makeKey({ management_type: "TP", mandante: item.mandante || null, rut: rutValue(item.rut), entidad: item.entity || null, numero_solicitud: item.request_number || null }));
  }

  for (const reqChunk of chunkArray(requestList, 500)) {
    if (!reqChunk.length) continue;
    const [lm, tp] = await Promise.all([
      prisma.lmRecord.findMany({ where: { request_number: { in: reqChunk } }, select: { rut: true, request_number: true, entity: true, mandante: true }, take: 10000 }),
      prisma.tpRecord.findMany({ where: { request_number: { in: reqChunk } }, select: { rut: true, request_number: true, entity: true, mandante: true }, take: 10000 }),
    ]);
    for (const item of lm) existing.add(makeKey({ management_type: "LM", mandante: item.mandante || null, rut: rutValue(item.rut), entidad: item.entity || null, numero_solicitud: item.request_number || null }));
    for (const item of tp) existing.add(makeKey({ management_type: "TP", mandante: item.mandante || null, rut: rutValue(item.rut), entidad: item.entity || null, numero_solicitud: item.request_number || null }));
  }

  for (const row of rows) {
    if (existing.has(row.duplicate_key)) {
      row.exists_in_database = true;
      row.validation_messages.push("Posible duplicado en base de datos");
      if (row.validation_status === "OK") row.validation_status = "ADVERTENCIA";
    }
  }
}

function stats(rows: NormalizedImportRow[]) {
  const total = rows.length;
  const ok = rows.filter((r) => r.validation_status === "OK").length;
  const warnings = rows.filter((r) => r.validation_status === "ADVERTENCIA").length;
  const errors = rows.filter((r) => r.validation_status === "ERROR").length;
  const duplicatesInFile = rows.filter((r) => r.is_duplicate_in_file).length;
  const duplicatesInDb = rows.filter((r) => r.exists_in_database).length;
  const monto = rows.reduce((acc, r) => acc + (r.monto_devolucion || 0), 0);
  const byMandante = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.mandante || "Sin mandante";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byEstado = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.estado_gestion || "Sin estado";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return { total, ok, warnings, errors, duplicatesInFile, duplicatesInDb, monto, byMandante, byEstado };
}

async function buildAiReview(rows: NormalizedImportRow[], headers: string[], mappedColumns: Array<{ header: string; field: string; label: string }>, unmappedHeaders: string[]) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.crm || process.env.CRM;
  if (!apiKey) return "IA no ejecutada: falta OPENAI_API_KEY/crm. La validación técnica sí fue realizada.";
  try {
    const sample = rows.slice(0, 12).map((row) => ({
      fila: row.rowNumber,
      mandante: row.mandante,
      rut: row.rut,
      razon_social: row.razon_social,
      entidad: row.entidad,
      estado: row.estado_gestion,
      monto: row.monto_devolucion,
      validacion: row.validation_status,
      mensajes: row.validation_messages,
    }));
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        input: [
          { role: "system", content: "Eres un analista de carga masiva para un CRM de recuperaciones previsionales en Chile. Entrega una revisión breve, concreta y accionable. No inventes datos." },
          { role: "user", content: JSON.stringify({ headers, mappedColumns, unmappedHeaders, stats: stats(rows), sample }, null, 2) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI error ${response.status}: ${await response.text()}`);
    const data: any = await response.json();
    return data.output_text || data.output?.flatMap((item: any) => item.content || []).map((part: any) => part.text || "").join("\n") || "IA ejecutada sin observaciones adicionales.";
  } catch (error: any) {
    return `IA no disponible para esta revisión: ${error?.message || "error desconocido"}`;
  }
}

const mandanteCache = new Map<string, any>();
const groupCache = new Map<string, any>();
const companyCache = new Map<string, any>();
const lineCache = new Map<string, any>();
const afpCache = new Map<string, any>();

async function ensureContext(row: NormalizedImportRow) {
  const mandanteName = row.mandante || "Sin mandante";
  let mandante = mandanteCache.get(mandanteName);
  if (!mandante) {
    mandante = await prisma.mandante.upsert({ where: { name: mandanteName }, update: {}, create: { name: mandanteName } });
    mandanteCache.set(mandanteName, mandante);
  }

  const groupName = row.grupo_empresa || "Grupo general";
  const groupKey = `${mandante.id}|${row.management_type}|${groupName}`;
  let group = groupCache.get(groupKey);
  if (!group) {
    group = await prisma.companyGroup.upsert({
      where: { mandante_id_group_type_name: { mandante_id: mandante.id, group_type: row.management_type as any, name: groupName } },
      update: {},
      create: { mandante_id: mandante.id, group_type: row.management_type as any, name: groupName },
    });
    groupCache.set(groupKey, group);
  }

  const rut = row.rut || `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let company = companyCache.get(rut);
  if (!company) {
    company = await prisma.company.upsert({
      where: { rut },
      update: { mandante_id: mandante.id, group_id: group.id, razon_social: row.razon_social || "Empresa sin razón social" },
      create: { mandante_id: mandante.id, group_id: group.id, rut, razon_social: row.razon_social || "Empresa sin razón social" },
    });
    companyCache.set(rut, company);
  }

  const lineKey = `${mandante.id}|${group.id}|${company.id}|${row.management_type}`;
  let line = lineCache.get(lineKey);
  if (!line) {
    line = await prisma.managementLine.findFirst({ where: { mandante_id: mandante.id, group_id: group.id, company_id: company.id, line_type: row.management_type as any } });
    if (!line) {
      line = await prisma.managementLine.create({ data: { mandante_id: mandante.id, group_id: group.id, company_id: company.id, line_type: row.management_type as any, name: `${company.razon_social} - ${row.management_type}`, portal_access: row.acceso_portal || undefined, mes_produccion_2026: row.mes_produccion_2026 || undefined, comment: row.comment || undefined } });
    }
    lineCache.set(lineKey, line);
  }

  let lineAfp = null;
  if (row.entidad) {
    const afpKey = `${line.id}|${row.entidad}`;
    lineAfp = afpCache.get(afpKey);
    if (!lineAfp) {
      lineAfp = await prisma.managementLineAfp.upsert({
        where: { line_id_afp_name: { line_id: line.id, afp_name: row.entidad } },
        update: { current_status: row.estado_gestion || undefined },
        create: { line_id: line.id, afp_name: row.entidad, current_status: row.estado_gestion || "Pendiente Gestión" },
      });
      afpCache.set(afpKey, lineAfp);
    }
  }

  return { mandante, group, company, line, lineAfp };
}

function dateOrNull(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getExistingColumns(tableName: string) {
  const columns = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    tableName
  );
  return new Set(columns.map((item) => item.column_name));
}

function buildManagementData(row: NormalizedImportRow, context: Awaited<ReturnType<typeof ensureContext>>) {
  return {
    id: `mgm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    mandante_id: context.mandante.id,
    group_id: context.group.id,
    company_id: context.company.id,
    line_id: context.line.id,
    line_afp_id: context.lineAfp?.id || null,
    management_type: row.management_type,
    owner_name: null,
    estado_contrato_cliente: row.estado_contrato_cliente,
    fecha_termino_contrato: dateOrNull(row.fecha_termino_contrato),
    motivo_tipo_exceso: row.motivo_tipo_exceso,
    mes_produccion_2026: row.mes_produccion_2026,
    mes_ingreso_solicitud: row.mes_ingreso_solicitud,
    entidad: row.entidad,
    envio_afp: row.envio_afp,
    estado_gestion: row.estado_gestion,
    fecha_presentacion_afp: dateOrNull(row.fecha_presentacion_afp),
    fecha_ingreso_afp: dateOrNull(row.fecha_ingreso_afp),
    fecha_pago_afp: dateOrNull(row.fecha_pago_afp),
    numero_solicitud: row.numero_solicitud,
    grupo_empresa: row.grupo_empresa,
    razon_social: row.razon_social,
    rut: row.rut,
    direccion: row.direccion,
    monto_devolucion: row.monto_devolucion,
    monto_pagado: row.monto_pagado,
    monto_cliente: row.monto_cliente,
    monto_finanfix_solutions: row.monto_finanfix_solutions,
    monto_real_cliente: row.monto_real_cliente,
    monto_real_finanfix_solutions: row.monto_real_finanfix_solutions,
    fee: row.fee,
    banco: row.banco,
    tipo_cuenta: row.tipo_cuenta,
    numero_cuenta: row.numero_cuenta,
    confirmacion_cc: row.confirmacion_cc,
    confirmacion_poder: row.confirmacion_poder,
    acceso_portal: row.acceso_portal,
    facturado_finanfix: row.facturado_finanfix,
    facturado_cliente: row.facturado_cliente,
    fecha_factura_finanfix: dateOrNull(row.fecha_factura_finanfix),
    fecha_pago_factura_finanfix: dateOrNull(row.fecha_pago_factura_finanfix),
    fecha_notificacion_cliente: dateOrNull(row.fecha_notificacion_cliente),
    numero_factura: row.numero_factura,
    numero_oc: row.numero_oc,
    fecha_rechazo: dateOrNull(row.fecha_rechazo),
    motivo_rechazo: row.motivo_rechazo,
    consulta_cen: row.consulta_cen,
    contenido_cen: row.contenido_cen,
    respuesta_cen: row.respuesta_cen,
    estado_trabajador: row.estado_trabajador,
    comment: row.comment,
    last_activity_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };
}

async function insertDynamic(tableName: string, data: Record<string, unknown>) {
  const existing = await getExistingColumns(tableName);
  if (!existing.has("id")) return null;

  const entries = Object.entries(data).filter(([column, value]) => existing.has(column) && value !== undefined);
  const sqlColumns = entries.map(([column]) => `"${column}"`).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `insert into ${tableName} (${sqlColumns}) values (${placeholders}) returning *`,
    ...values
  );
  return rows[0] || null;
}

async function createManagement(row: NormalizedImportRow, context: Awaited<ReturnType<typeof ensureContext>>) {
  const data = buildManagementData(row, context);
  try {
    const { id, created_at, updated_at, ...prismaData } = data;
    return await prisma.management.create({ data: prismaData as any });
  } catch (error) {
    console.warn("Prisma management.create falló; se intenta insert dinámico compatible Railway:", error);
    try {
      return await insertDynamic("managements", data);
    } catch (dynamicError) {
      console.warn("Insert dinámico managements falló; se usará solo respaldo legacy:", dynamicError);
      return null;
    }
  }
}

function buildLegacyData(row: NormalizedImportRow, context: Awaited<ReturnType<typeof ensureContext>>, management: any) {
  return {
    id: `${row.management_type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    management_id: management?.id || null,
    mandante_id: context.mandante.id,
    company_id: context.company.id,
    line_id: context.line.id,
    line_afp_id: context.lineAfp?.id || null,
    search_group: row.grupo_empresa,
    rut: row.rut,
    entity: row.entidad,
    management_status: row.estado_gestion,
    refund_amount: row.monto_devolucion,
    actual_paid_amount: row.monto_pagado,
    request_number: row.numero_solicitud,
    business_name: row.razon_social,
    bank_name: row.banco,
    account_number: row.numero_cuenta,
    account_type: row.tipo_cuenta,
    comment: row.comment || "Creado por carga masiva inteligente",
    mandante: context.mandante.name,
    portal_access: row.acceso_portal,
    direccion: row.direccion,
    confirmation_cc: row.confirmacion_cc,
    confirmation_power: row.confirmacion_poder,
    estado_contrato_cliente: row.estado_contrato_cliente,
    fecha_termino_contrato: dateOrNull(row.fecha_termino_contrato),
    motivo_tipo_exceso: row.motivo_tipo_exceso,
    excess_type_reason: row.motivo_tipo_exceso,
    mes_produccion_2026: row.mes_produccion_2026,
    mes_ingreso_solicitud: row.mes_ingreso_solicitud,
    envio_afp: row.envio_afp,
    fecha_presentacion_afp: dateOrNull(row.fecha_presentacion_afp),
    fecha_ingreso_afp: dateOrNull(row.fecha_ingreso_afp),
    fecha_pago_afp: dateOrNull(row.fecha_pago_afp),
    monto_cliente: row.monto_cliente,
    fee: row.fee,
    monto_finanfix_solutions: row.monto_finanfix_solutions,
    monto_real_cliente: row.monto_real_cliente,
    monto_real_finanfix_solutions: row.monto_real_finanfix_solutions,
    facturado_finanfix: row.facturado_finanfix,
    facturado_cliente: row.facturado_cliente,
    fecha_factura_finanfix: dateOrNull(row.fecha_factura_finanfix),
    fecha_pago_factura_finanfix: dateOrNull(row.fecha_pago_factura_finanfix),
    fecha_notificacion_cliente: dateOrNull(row.fecha_notificacion_cliente),
    numero_factura: row.numero_factura,
    numero_oc: row.numero_oc,
    fecha_rechazo: dateOrNull(row.fecha_rechazo),
    motivo_rechazo: row.motivo_rechazo,
    consulta_cen: row.consulta_cen,
    contenido_cen: row.contenido_cen,
    respuesta_cen: row.respuesta_cen,
    worker_status: row.estado_trabajador,
    last_activity_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };
}

async function createLegacyRecord(row: NormalizedImportRow, context: Awaited<ReturnType<typeof ensureContext>>, management: any) {
  const tableName = row.management_type === "TP" ? "tp_records" : "lm_records";
  const data = buildLegacyData(row, context, management);

  try {
    if (row.management_type === "TP") return await prisma.tpRecord.create({ data: data as any });
    return await prisma.lmRecord.create({ data: data as any });
  } catch (error) {
    console.warn(`Prisma ${tableName}.create falló; se intenta insert dinámico:`, error);
    return await insertDynamic(tableName, data);
  }
}

async function insertRow(row: NormalizedImportRow, skipDuplicates: boolean) {
  if (row.validation_status === "ERROR") return { status: "skipped", rowNumber: row.rowNumber, reason: "Fila con error crítico" };
  if (skipDuplicates && (row.is_duplicate_in_file || row.exists_in_database)) return { status: "skipped", rowNumber: row.rowNumber, reason: "Duplicado omitido" };

  const context = await ensureContext(row);
  const management = await createManagement(row, context);
  await createLegacyRecord(row, context, management);

  if (management?.id) {
    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: management.id,
        management_id: management.id,
        activity_type: "CARGA MASIVA",
        status: "Completada",
        description: `Registro creado desde Excel. Fila ${row.rowNumber}. Mandante: ${row.mandante || "Sin mandante"}`,
      },
    }).catch(() => null);
  }
  return { status: "created", rowNumber: row.rowNumber, id: management?.id || null };
}

importRecordsRouter.post("/records/preview", upload.single("file"), async (req, res) => {
  cleanupSessions();
  try {
    if (!req.file) return res.status(400).json({ message: "Debes adjuntar un archivo Excel." });
    const parsed = parseWorkbook(req.file.buffer);
    await markDatabaseDuplicates(parsed.rows);
    const id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    importSessions.set(id, { id, createdAt: Date.now(), fileName: req.file.originalname, rows: parsed.rows, headers: parsed.headers, mappedColumns: parsed.mappedColumns, unmappedHeaders: parsed.unmappedHeaders });
    const aiReview = await buildAiReview(parsed.rows, parsed.headers, parsed.mappedColumns, parsed.unmappedHeaders);
    res.json({
      importId: id,
      fileName: req.file.originalname,
      sheetName: parsed.sheetName,
      headers: parsed.headers,
      fieldCatalog: CRM_IMPORT_FIELDS.map((field) => ({ field: field.field, label: field.label, type: field.type })),
      mappedColumns: parsed.mappedColumns,
      unmappedHeaders: parsed.unmappedHeaders,
      stats: stats(parsed.rows),
      aiReview,
      rows: parsed.rows.slice(0, 100),
      totalRows: parsed.rows.length,
    });
  } catch (error: any) {
    console.error("Error preview carga masiva:", error);
    res.status(500).json({ message: "No se pudo procesar el Excel.", detail: error?.message || String(error) });
  }
});

importRecordsRouter.post("/records/commit", async (req, res) => {
  cleanupSessions();
  try {
    const importId = String(req.body.importId || "");
    const skipDuplicates = req.body.skipDuplicates !== false;
    const batchSize = Math.max(1, Math.min(Number(req.body.batchSize || 25), 100));
    const session = importSessions.get(importId);
    if (!session) return res.status(404).json({ message: "La vista previa expiró. Vuelve a cargar el archivo." });
    const results: any[] = [];
    for (const batch of chunkArray(session.rows, batchSize)) {
      const batchResults = await Promise.all(batch.map(async (row) => {
        try {
          return await insertRow(row, skipDuplicates);
        } catch (error: any) {
          return { status: "error", rowNumber: row.rowNumber, reason: error?.message || String(error) };
        }
      }));
      results.push(...batchResults);
    }
    importSessions.delete(importId);
    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;
    res.json({ ok: errors === 0, created, skipped, errors, batchSize, results: results.slice(0, 100) });
  } catch (error: any) {
    console.error("Error commit carga masiva:", error);
    res.status(500).json({ message: "No se pudo confirmar la carga masiva.", detail: error?.message || String(error) });
  }
});

export default importRecordsRouter;
