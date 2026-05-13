import express from "express";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const apiKey = process.env.OPENAI_API_KEY || process.env.crm || process.env.CRM || "";
const openai = new OpenAI({
  apiKey: apiKey || "dummy",
});

type FilterOperator = "contains" | "equals" | "gt" | "gte" | "lt" | "lte";

type AIFieldFilter = {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean;
};

type AIQueryPlan = {
  intent:
    | "query_records"
    | "aggregate"
    | "export_excel"
    | "suggest_management"
    | "general_answer";
  filters: AIFieldFilter[];
  columns: string[];
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
  };
  groupBy?: string[];
  limit?: number;
  answerHint?: string;
};

type ChatMemory = {
  lastPlan?: AIQueryPlan;
  lastRows?: Record<string, unknown>[];
  lastColumns?: string[];
};

const memory = new Map<string, ChatMemory>();

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  management_type: "Tipo",
  mandante: "Mandante",
  mandante_id: "ID Mandante",
  search_group: "Grupo empresa",
  business_name: "Razón Social",
  rut: "RUT",
  entity: "Entidad / AFP",
  management_status: "Estado Gestión",
  request_number: "N° Solicitud",
  refund_amount: "Monto Devolución",
  actual_paid_amount: "Monto Real Pagado",
  client_amount: "Monto cliente",
  finanfix_amount: "Monto Finanfix",
  actual_client_amount: "Monto real cliente",
  actual_finanfix_amount: "Monto real Finanfix Solutions",
  fee: "FEE",
  confirmation_cc: "Confirmación CC",
  confirmation_power: "Confirmación Poder",
  bank_name: "Banco",
  account_type: "Tipo de Cuenta",
  account_number: "Número cuenta",
  portal_access: "Acceso portal",
  afp_shipment: "Envío AFP",
  client_contract_status: "Estado contrato con cliente",
  contract_end_date: "Fecha término contrato",
  excess_type_reason: "Motivo Tipo de exceso",
  production_months: "Mes de producción",
  request_entry_month: "Mes ingreso solicitud",
  afp_submission_date: "Fecha presentación AFP",
  afp_entry_date: "Fecha ingreso AFP",
  afp_payment_date: "Fecha Pago AFP",
  invoice_number: "N° Factura",
  oc_number: "N° OC",
  rejection_date: "Fecha rechazo",
  rejection_reason: "Motivo rechazo",
  cen_query: "Consulta CEN",
  cen_content: "Contenido CEN",
  cen_response: "Respuesta CEN",
  worker_status: "Estado Trabajador",
  finanfix_invoice_date: "Fecha Factura Finanfix",
  finanfix_invoice_payment_date: "Fecha pago factura Finanfix",
  client_notification_date: "Fecha notificación cliente",
  comment: "Comentario",
  created_at: "Creado",
  updated_at: "Actualizado",
  last_activity_at: "Última actividad",
};

const CRM_FIELDS = Object.keys(FIELD_LABELS);

const DEFAULT_COLUMNS = [
  "mandante",
  "business_name",
  "rut",
  "entity",
  "management_status",
  "refund_amount",
  "confirmation_cc",
  "confirmation_power",
  "request_number",
];

const BOOLEAN_FIELDS = new Set(["confirmation_cc", "confirmation_power"]);

const NUMBER_FIELDS = new Set([
  "refund_amount",
  "actual_paid_amount",
  "client_amount",
  "finanfix_amount",
  "actual_client_amount",
  "actual_finanfix_amount",
  "fee",
]);

function normalize(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCompact(value: unknown): string {
  return normalize(value).replace(/\s+/g, "");
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function fuzzyIncludes(source: unknown, search: unknown): boolean {
  const s1 = normalize(source);
  const s2 = normalize(search);

  if (!s1 || !s2) return false;

  if (s1.includes(s2) || s2.includes(s1)) return true;

  const c1 = normalizeCompact(source);
  const c2 = normalizeCompact(search);

  if (c1.includes(c2) || c2.includes(c1)) return true;

  const sourceParts = s1.split(" ").filter(Boolean);
  const searchParts = s2.split(" ").filter(Boolean);

  if (!sourceParts.length || !searchParts.length) return false;

  return searchParts.every((part) => {
    return sourceParts.some((candidate) => {
      if (candidate.includes(part) || part.includes(candidate)) return true;

      const maxDistance = part.length <= 4 ? 1 : 2;
      return levenshtein(candidate, part) <= maxDistance;
    });
  });
}

function money(value: unknown): string {
  const n = Number(value || 0);

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value || "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;

  const normalized = normalize(value);

  if (
    normalized === "si" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized.includes("confirmado") ||
    normalized.includes("vigente") ||
    normalized.includes("tiene")
  ) {
    return true;
  }

  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "0" ||
    normalized.includes("pendiente") ||
    normalized.includes("sin") ||
    normalized.includes("no tiene")
  ) {
    return false;
  }

  return null;
}

function isTruthySi(value: unknown): boolean {
  const normalized = normalizeBooleanValue(value);
  if (normalized !== null) return normalized;
  return false;
}

function normalizePlanValue(field: string, value: unknown): string | number | boolean {
  if (BOOLEAN_FIELDS.has(field)) {
    return normalizeBooleanValue(value) ?? Boolean(value);
  }

  if (NUMBER_FIELDS.has(field)) {
    return parseNumber(value);
  }

  return String(value ?? "");
}

async function interpretWithOpenAI(
  message: string,
  fields: string[],
  previous?: ChatMemory
): Promise<AIQueryPlan> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY, crm o CRM no está configurada.");
  }

  const system = `
Eres el chat inteligente de OperaFix, un CRM de recuperación previsional.

Tu trabajo es interpretar exactamente lo que el usuario pide y convertirlo en un plan JSON seguro.

Reglas críticas:
- Debes comportarte como ChatGPT conversando con el CRM.
- Entiende errores ortográficos, frases incompletas y sinónimos.
- No inventes campos: usa SOLO los campos disponibles.
- No cambies la intención del usuario.
- No conviertas una búsqueda normal en sugerencia.
- Usa suggest_management solo si el usuario pide explícitamente: "sugerencias", "prioriza", "qué gestiono primero", "casos listos", "mejores condiciones para gestionar".
- Para textos usa SIEMPRE operator "contains".
- Para booleanos usa operator "equals" con true o false.
- Para montos usa gt/gte/lt/lte cuando corresponda.
- Si el usuario dice "ahora", usa el contexto anterior.

Campos disponibles reales:
${fields.join(", ")}

Equivalencias importantes:
- Confirmación CC, CC, cuenta corriente => confirmation_cc
- Confirmación Poder, poder => confirmation_power
- Estado Gestión, estado, gestión => management_status
- AFP, entidad, administradora => entity
- Monto, plata, devolución, lucas => refund_amount
- Razón Social, empresa, compañía => business_name
- Grupo empresa, grupo => search_group
- N° Solicitud, número solicitud, solicitud => request_number
- Mundo, Previsional, Mundo Previsional, mundo previsonal => mandante contains "Mundo Previsional"
- Optimiza, Optmiza, Optimisa => mandante contains "Optimiza"
- Capital, AFP Capital => entity contains "Capital"
- Modelo, AFP Modelo => entity contains "Modelo"
- Habitat, AFP Habitat => entity contains "Habitat"
- Provida, AFP Provida => entity contains "Provida"
- Cuprum, AFP Cuprum => entity contains "Cuprum"
- Planvital, AFP Planvital => entity contains "Planvital"
- Uno, AFP Uno => entity contains "Uno"
- Gestionado, gestionada => management_status contains "Gestionado"
- Pendiente, pendiente gestión => management_status contains "Pendiente"
- Pagado, pagada => management_status contains "Pag"
- Rechazado, rechazo => management_status contains "Rechaz"

Devuelve SOLO JSON válido con esta estructura:

{
  "intent": "query_records" | "aggregate" | "export_excel" | "suggest_management" | "general_answer",
  "filters": [
    {
      "field": "campo_real",
      "operator": "contains" | "equals" | "gt" | "gte" | "lt" | "lte",
      "value": "valor"
    }
  ],
  "columns": ["campo_real"],
  "orderBy": {
    "field": "campo_real",
    "direction": "asc" | "desc"
  },
  "groupBy": ["campo_real"],
  "limit": 100,
  "answerHint": "respuesta breve en español natural"
}

Reglas de columnas:
- Si el usuario pide campos específicos, usa esos campos.
- Si el usuario pide todos los campos, usa todos los campos disponibles.
- Si no pide campos, usa columnas principales:
  mandante, business_name, rut, entity, management_status, refund_amount, confirmation_cc, confirmation_power, request_number.

Ejemplos:
Usuario: "muestrame mundo capital gestionado"
JSON:
{
  "intent": "query_records",
  "filters": [
    { "field": "mandante", "operator": "contains", "value": "Mundo Previsional" },
    { "field": "entity", "operator": "contains", "value": "Capital" },
    { "field": "management_status", "operator": "contains", "value": "Gestionado" }
  ],
  "columns": ["mandante", "business_name", "rut", "entity", "management_status", "refund_amount", "confirmation_cc", "confirmation_power", "request_number"],
  "orderBy": { "field": "refund_amount", "direction": "desc" },
  "limit": 100,
  "answerHint": "Busqué casos gestionados de Mundo Previsional en AFP Capital."
}

Usuario: "casos con cc si y poder no"
JSON:
{
  "intent": "query_records",
  "filters": [
    { "field": "confirmation_cc", "operator": "equals", "value": true },
    { "field": "confirmation_power", "operator": "equals", "value": false }
  ],
  "columns": ["mandante", "business_name", "rut", "entity", "management_status", "refund_amount", "confirmation_cc", "confirmation_power", "request_number"],
  "orderBy": { "field": "refund_amount", "direction": "desc" },
  "limit": 100,
  "answerHint": "Busqué casos con cuenta corriente confirmada y poder pendiente."
}
`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
          message,
          previousPlan: previous?.lastPlan || null,
          previousColumns: previous?.lastColumns || null,
        }),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content || "{}";
  return JSON.parse(raw) as AIQueryPlan;
}

function sanitizePlan(plan: AIQueryPlan, fields: string[]): AIQueryPlan {
  const fieldSet = new Set(fields);

  const filters = (plan.filters || [])
    .filter((filter) => fieldSet.has(filter.field))
    .map((filter) => {
      const value = normalizePlanValue(filter.field, filter.value);

      if (BOOLEAN_FIELDS.has(filter.field)) {
        return {
          ...filter,
          operator: "equals" as const,
          value,
        };
      }

      if (NUMBER_FIELDS.has(filter.field)) {
        return {
          ...filter,
          value,
        };
      }

      return {
        ...filter,
        operator: filter.operator === "equals" ? ("contains" as const) : filter.operator,
        value,
      };
    });

  const columns =
    plan.columns && plan.columns.length
      ? plan.columns.filter((column) => fieldSet.has(column))
      : DEFAULT_COLUMNS.filter((column) => fieldSet.has(column));

  const orderBy =
    plan.orderBy && fieldSet.has(plan.orderBy.field)
      ? plan.orderBy
      : fields.includes("refund_amount")
        ? { field: "refund_amount", direction: "desc" as const }
        : undefined;

  return {
    intent: plan.intent || "query_records",
    filters,
    columns,
    orderBy,
    groupBy: (plan.groupBy || []).filter((group) => fieldSet.has(group)),
    limit: Math.min(Math.max(Number(plan.limit || 100), 1), 500),
    answerHint: plan.answerHint,
  };
}

function buildWhere(filters: AIFieldFilter[]): Record<string, unknown> {
  const AND: Record<string, unknown>[] = [];

  for (const filter of filters || []) {
    const { field, operator } = filter;
    const value = normalizePlanValue(field, filter.value);

    if (BOOLEAN_FIELDS.has(field)) {
      AND.push({ [field]: value });
      continue;
    }

    if (NUMBER_FIELDS.has(field)) {
      const numericValue = parseNumber(value);

      if (operator === "gt" || operator === "gte" || operator === "lt" || operator === "lte") {
        AND.push({ [field]: { [operator]: numericValue } });
      } else {
        AND.push({ [field]: numericValue });
      }

      continue;
    }

    AND.push({
      [field]: {
        contains: String(value),
        mode: "insensitive",
      },
    });
  }

  return AND.length ? { AND } : {};
}

function buildSelect(columns: string[]): Record<string, boolean> {
  return {
    id: true,
    ...Object.fromEntries(columns.map((column) => [column, true])),
  };
}

function legacyRowToAIRecord(row: any, managementType: "LM" | "TP"): Record<string, unknown> {
  return {
    id: row.management_id || row.id,
    management_type: managementType,
    mandante: row.mandante || row.mandante_name || row.client_name || null,
    mandante_id: row.mandante_id || null,
    search_group: row.search_group || row.grupo_empresa || null,
    business_name: row.business_name || row.razon_social || row.company_name || null,
    rut: row.rut || row.company_rut || null,
    entity: row.entity || row.entidad || row.afp_name || null,
    management_status: row.management_status || row.estado_gestion || null,
    request_number: row.request_number || row.numero_solicitud || null,
    refund_amount: row.refund_amount ?? row.monto_devolucion ?? null,
    actual_paid_amount: row.actual_paid_amount ?? row.monto_pagado ?? null,
    client_amount: row.client_amount ?? row.monto_cliente ?? null,
    finanfix_amount: row.finanfix_amount ?? row.monto_finanfix_solutions ?? null,
    actual_client_amount: row.actual_client_amount ?? row.monto_real_cliente ?? null,
    actual_finanfix_amount: row.actual_finanfix_amount ?? row.monto_real_finanfix_solutions ?? null,
    fee: row.fee ?? null,
    confirmation_cc: Boolean(row.confirmation_cc ?? row.confirmacion_cc ?? false),
    confirmation_power: Boolean(row.confirmation_power ?? row.confirmacion_poder ?? false),
    bank_name: row.bank_name || row.banco || null,
    account_type: row.account_type || row.tipo_cuenta || null,
    account_number: row.account_number || row.numero_cuenta || null,
    portal_access: row.portal_access || row.acceso_portal || null,
    afp_shipment: row.afp_shipment || row.envio_afp || null,
    client_contract_status: row.client_contract_status || row.estado_contrato_cliente || null,
    contract_end_date: row.contract_end_date || row.fecha_termino_contrato || null,
    excess_type_reason: row.excess_type_reason || row.motivo_tipo_exceso || null,
    production_months: row.production_months || row.mes_produccion_2026 || null,
    request_entry_month: row.request_entry_month || row.mes_ingreso_solicitud || null,
    afp_submission_date: row.afp_submission_date || row.fecha_presentacion_afp || null,
    afp_entry_date: row.afp_entry_date || row.fecha_ingreso_afp || null,
    afp_payment_date: row.afp_payment_date || row.fecha_pago_afp || null,
    invoice_number: row.invoice_number || row.numero_factura || null,
    oc_number: row.oc_number || row.numero_oc || null,
    rejection_date: row.rejection_date || row.fecha_rechazo || null,
    rejection_reason: row.rejection_reason || row.motivo_rechazo || null,
    cen_query: row.cen_query || row.consulta_cen || null,
    cen_content: row.cen_content || row.contenido_cen || null,
    cen_response: row.cen_response || row.respuesta_cen || null,
    worker_status: row.worker_status || row.estado_trabajador || null,
    finanfix_invoice_date: row.finanfix_invoice_date || row.fecha_factura_finanfix || null,
    finanfix_invoice_payment_date: row.finanfix_invoice_payment_date || row.fecha_pago_factura_finanfix || null,
    client_notification_date: row.client_notification_date || row.fecha_notificacion_cliente || null,
    comment: row.comment || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_activity_at: row.last_activity_at || null,
  };
}

async function loadAllCRMRows(): Promise<Record<string, unknown>[]> {
  const [lmRows, tpRows] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`
      SELECT *
      FROM lm_records
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5000
    `),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT *
      FROM tp_records
      ORDER BY created_at DESC NULLS LAST
      LIMIT 5000
    `),
  ]);

  return [
    ...lmRows.map((row) => legacyRowToAIRecord(row, "LM")),
    ...tpRows.map((row) => legacyRowToAIRecord(row, "TP")),
  ];
}

function rowMatchesFilter(row: Record<string, unknown>, filter: AIFieldFilter): boolean {
  const fieldValue = row[filter.field];
  const value = normalizePlanValue(filter.field, filter.value);

  if (BOOLEAN_FIELDS.has(filter.field)) {
    const rowBool = normalizeBooleanValue(fieldValue) ?? Boolean(fieldValue);
    const targetBool = normalizeBooleanValue(value) ?? Boolean(value);
    return rowBool === targetBool;
  }

  if (NUMBER_FIELDS.has(filter.field)) {
    const n1 = parseNumber(fieldValue);
    const n2 = parseNumber(value);

    if (filter.operator === "gt") return n1 > n2;
    if (filter.operator === "gte") return n1 >= n2;
    if (filter.operator === "lt") return n1 < n2;
    if (filter.operator === "lte") return n1 <= n2;

    return n1 === n2;
  }

  return fuzzyIncludes(fieldValue, value);
}

async function runQuery(
  plan: AIQueryPlan,
  fields: string[]
): Promise<Record<string, unknown>[]> {
  const rows = await loadAllCRMRows();

  let filtered = rows.filter((row) => {
    return (plan.filters || []).every((filter) => rowMatchesFilter(row, filter));
  });

  if (plan.orderBy?.field) {
    filtered.sort((a, b) => {
      const aVal = a[plan.orderBy!.field];
      const bVal = b[plan.orderBy!.field];

      if (NUMBER_FIELDS.has(plan.orderBy!.field)) {
        const result = parseNumber(aVal) - parseNumber(bVal);
        return plan.orderBy!.direction === "desc" ? result * -1 : result;
      }

      const result = String(aVal ?? "").localeCompare(String(bVal ?? ""), "es", {
        numeric: true,
        sensitivity: "base",
      });

      return plan.orderBy!.direction === "desc" ? result * -1 : result;
    });
  }

  const columns = plan.columns?.length ? plan.columns : DEFAULT_COLUMNS;

  return filtered.slice(0, plan.limit || 100).map((row) => {
    const result: Record<string, unknown> = { id: row.id };

    for (const column of columns) {
      result[column] = row[column];
    }

    return result;
  });
}

async function runSuggestions(fields: string[]): Promise<Record<string, unknown>[]> {
  const rows = await loadAllCRMRows();

  const filtered = rows
    .filter((row) => {
      const isPending = fuzzyIncludes(row.management_status, "Pendiente");
      const hasCc = isTruthySi(row.confirmation_cc);
      const hasPower = isTruthySi(row.confirmation_power);
      const hasEntity = Boolean(normalize(row.entity));
      const hasAmount = parseNumber(row.refund_amount) > 0;

      return isPending && hasCc && hasPower && hasEntity && hasAmount;
    })
    .sort((a, b) => parseNumber(b.refund_amount) - parseNumber(a.refund_amount))
    .slice(0, 100);

  return filtered.map((row) => {
    const result: Record<string, unknown> = { id: row.id };

    for (const column of DEFAULT_COLUMNS) {
      result[column] = row[column];
    }

    return result;
  });
}

function buildAnswer(plan: AIQueryPlan, rows: Record<string, unknown>[]): string {
  const totalMonto = rows.reduce((acc, row) => acc + parseNumber(row.refund_amount), 0);

  if (plan.intent === "suggest_management") {
    return `Encontré ${rows.length} casos que están en mejores condiciones para gestionar. Priorizo los que tienen monto, estado pendiente, entidad asignada, Confirmación CC y Confirmación Poder. Monto total aproximado: ${money(totalMonto)}.`;
  }

  if (plan.intent === "export_excel") {
    return `Preparé la última consulta para descarga en Excel. Hay ${rows.length} registros en el resultado actual.`;
  }

  if (plan.answerHint) {
    return `${plan.answerHint} Encontré ${rows.length} registros. Monto Devolución total aproximado: ${money(totalMonto)}.`;
  }

  return `Encontré ${rows.length} registros según tu solicitud. Monto Devolución total aproximado: ${money(totalMonto)}.`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);

  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    headers.map(escape).join(";"),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(";")),
  ].join("\n");
}

router.post("/message", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const userId = String(req.body?.userId || "default");

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Debes enviar un mensaje.",
      });
    }

    const fields = CRM_FIELDS;
    const previous = memory.get(userId);

    let plan = await interpretWithOpenAI(message, fields, previous);
    plan = sanitizePlan(plan, fields);

    if (
      normalize(message).includes("ahora") &&
      previous?.lastPlan &&
      plan.filters.length === 0
    ) {
      plan.filters = previous.lastPlan.filters || [];
    }

    let rows: Record<string, unknown>[] = [];

    if (plan.intent === "suggest_management") {
      rows = await runSuggestions(fields);
    } else if (plan.intent === "export_excel" && previous?.lastRows) {
      rows = previous.lastRows;
      plan.columns = previous.lastColumns || plan.columns;
    } else {
      rows = await runQuery(plan, fields);
    }

    const answer = buildAnswer(plan, rows);

    memory.set(userId, {
      lastPlan: plan,
      lastRows: rows,
      lastColumns: plan.columns,
    });

    return res.json({
      success: true,
      answer,
      plan,
      columns: plan.columns.map((field) => ({
        field,
        label: FIELD_LABELS[field] || field,
      })),
      total: rows.length,
      rows,
      canExport: rows.length > 0,
    });
  } catch (error) {
    console.error("ERROR IA CHAT:", error);

    return res.status(200).json({
      success: false,
      answer:
        "No pude procesar la solicitud del CRM. Revisa que OPENAI_API_KEY o crm esté configurada y que existan las tablas lm_records/tp_records.",
      error: error instanceof Error ? error.message : "Error desconocido",
      rows: [],
      columns: [],
      canExport: false,
    });
  }
});

router.get("/export", async (req, res) => {
  const userId = String(req.query.userId || "default");
  const state = memory.get(userId);

  if (!state?.lastRows?.length) {
    return res.status(400).json({
      success: false,
      error: "No existe una consulta previa para exportar.",
    });
  }

  const csv = "\ufeff" + toCsv(state.lastRows);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="operafix_resultado_ia.csv"`
  );

  return res.send(csv);
});

export default router;
