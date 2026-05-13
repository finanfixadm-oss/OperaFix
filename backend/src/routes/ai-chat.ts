import express from "express";
import OpenAI from "openai";
import { Prisma, PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const apiKey = process.env.OPENAI_API_KEY || process.env.crm || process.env.CRM || "";
const openai = new OpenAI({ apiKey: apiKey || "dummy" });

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

type FieldMeta = {
  name: string;
  type: string;
  kind: string;
  isList: boolean;
};

const memory = new Map<string, ChatMemory>();

const FIELD_LABELS: Record<string, string> = {
  mandante: "Mandante",
  management_type: "Tipo",
  mes_produccion_2026: "Mes de producción",
  mes_ingreso_solicitud: "Mes de ingreso solicitud",
  portal_access: "Acceso portal",
  envio_afp: "Envío AFP",
  estado_contrato_cliente: "Estado contrato con cliente",
  management_status: "Estado Gestión",
  request_number: "N° Solicitud",
  motivo_rechazo: "Motivo del rechazo/anulación",
  fecha_rechazo: "Fecha rechazo",
  search_group: "Buscar Grupo",
  owner_name: "Propietario",
  business_name: "Razón Social",
  rut: "RUT",
  direccion: "Dirección",
  entity: "Entidad (AFP)",
  bank_name: "Banco",
  account_type: "Tipo de Cuenta",
  account_number: "Número cuenta",
  confirmation_cc: "Confirmación CC",
  confirmation_power: "Confirmación Poder",
  consulta_cen: "Consulta CEN",
  contenido_cen: "Contenido CEN",
  respuesta_cen: "Respuesta CEN",
  worker_status: "Estado Trabajador",
  motivo_tipo_exceso: "Motivo Tipo de exceso",
  refund_amount: "Monto Devolución",
  actual_paid_amount: "Monto Real Pagado",
  monto_cliente: "Monto cliente",
  monto_finanfix_solutions: "Monto Finanfix",
  monto_real_cliente: "Monto real cliente",
  monto_real_finanfix_solutions: "Monto real Finanfix Solutions",
  fee: "FEE",
  facturado_cliente: "Facturado cliente",
  facturado_finanfix: "Facturado Finanfix",
  fecha_pago_afp: "Fecha Pago AFP",
  fecha_factura_finanfix: "Fecha Factura Finanfix",
  fecha_pago_factura_finanfix: "Fecha pago factura Finanfix",
  fecha_notificacion_cliente: "Fecha notificación cliente",
  numero_factura: "N° Factura",
  numero_oc: "N° OC",
  comment: "Comentario",
  created_at: "Creado",
  updated_at: "Actualizado",
};

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

function getLmRecordFieldMeta(): FieldMeta[] {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "LmRecord");

  return (
    model?.fields
      .filter((field) => field.kind === "scalar")
      .map((field) => ({
        name: field.name,
        type: field.type,
        kind: field.kind,
        isList: field.isList,
      })) || []
  );
}

function getLmRecordFields(): string[] {
  return getLmRecordFieldMeta().map((field) => field.name);
}

function getFieldTypeMap(): Map<string, FieldMeta> {
  return new Map(getLmRecordFieldMeta().map((field) => [field.name, field]));
}

function normalize(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function money(value: unknown): string {
  const n = Number(value || 0);

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const cleaned = String(value || "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function isTruthySi(value: unknown): boolean {
  const v = normalize(value);

  return (
    value === true ||
    v === "si" ||
    v === "true" ||
    v === "1" ||
    v.includes("confirmado") ||
    v.includes("vigente")
  );
}

function normalizeBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;

  const normalized = normalize(value);

  if (
    normalized === "si" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized.includes("confirmado") ||
    normalized.includes("vigente")
  ) {
    return true;
  }

  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "0" ||
    normalized.includes("pendiente") ||
    normalized.includes("sin")
  ) {
    return false;
  }

  return null;
}

async function interpretWithOpenAI(
  message: string,
  fields: string[],
  previous?: ChatMemory
): Promise<AIQueryPlan> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY, crm o CRM no está configurada en Railway.");
  }

  const system = `
Eres el chat inteligente de OperaFix, un CRM de recuperación previsional.

Tu trabajo es conversar como ChatGPT, interpretar exactamente lo que el usuario pide y convertirlo en una consulta segura al CRM.

IMPORTANTE:
- No uses reglas locales.
- No inventes campos.
- No cambies la intención del usuario.
- No conviertas una búsqueda normal en sugerencia.
- Solo usa suggest_management si el usuario pide explícitamente: "sugerencias", "prioriza", "qué gestiono primero", "casos listos", "mejores condiciones para gestionar".
- Si el usuario pide "poder no", filtra confirmation_power = false.
- Si el usuario pide "poder sí", filtra confirmation_power = true.
- Si el usuario pide "cc no", filtra confirmation_cc = false.
- Si el usuario pide "cc sí", filtra confirmation_cc = true.
- Si el usuario escribe mal, interpreta semánticamente.
- Si dice "ahora", usa el contexto anterior.

Campos disponibles reales:
${fields.join(", ")}

Equivalencias importantes:
- Confirmación CC, CC, cuenta corriente => confirmation_cc
- Confirmación Poder, poder => confirmation_power
- Estado Gestión, estado, gestión => management_status
- AFP, entidad => entity
- Monto, plata, devolución, lucas => refund_amount
- Razón Social, empresa => business_name
- N° Solicitud, número solicitud => request_number
- Mundo, Previsional, Mundo Previsional, mundo previsonal => mandante contiene "Mundo Previsional"
- Optimiza, Optmiza, Optimisa => mandante contiene "Optimiza"

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
- Si no pide campos, usa estas columnas principales:
  mandante, business_name, rut, entity, management_status, refund_amount, confirmation_cc, confirmation_power, request_number.

Reglas de filtros:
- Para campos booleanos usa true o false, nunca "Sí" ni "No".
- Para montos usa números.
- Para textos usa contains.
- Para estados usa contains.
- Si la consulta es "quiero casos con confirmación cc sí y confirmación poder no", debe ser query_records, NO suggest_management.
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
  const typeMap = getFieldTypeMap();

  const filters = (plan.filters || [])
    .filter((filter) => fieldSet.has(filter.field))
    .map((filter) => {
      const meta = typeMap.get(filter.field);

      if (meta?.type === "Boolean") {
        return {
          ...filter,
          operator: "equals" as const,
          value: normalizeBooleanValue(filter.value) ?? Boolean(filter.value),
        };
      }

      if (meta?.type === "Decimal" || meta?.type === "Int" || meta?.type === "Float") {
        const numeric = parseNumber(filter.value);
        if (numeric === null) return null;

        return {
          ...filter,
          operator: filter.operator === "contains" ? ("equals" as const) : filter.operator,
          value: numeric,
        };
      }

      if (meta?.type === "DateTime") {
        return null;
      }

      return filter;
    })
    .filter(Boolean) as AIFieldFilter[];

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
  const typeMap = getFieldTypeMap();

  for (const filter of filters || []) {
    const { field, operator } = filter;
    const meta = typeMap.get(field);

    if (!meta) continue;

    if (meta.type === "Boolean") {
      const boolValue = normalizeBooleanValue(filter.value);
      if (boolValue === null) continue;

      AND.push({ [field]: boolValue });
      continue;
    }

    if (meta.type === "Decimal" || meta.type === "Int" || meta.type === "Float") {
      const numeric = parseNumber(filter.value);
      if (numeric === null) continue;

      if (operator === "gt" || operator === "gte" || operator === "lt" || operator === "lte") {
        AND.push({ [field]: { [operator]: numeric } });
      } else {
        AND.push({ [field]: numeric });
      }

      continue;
    }

    if (meta.type === "String") {
      if (operator === "contains") {
        AND.push({
          [field]: {
            contains: String(filter.value),
            mode: "insensitive",
          },
        });
      } else if (operator === "equals") {
        AND.push({
          [field]: {
            equals: String(filter.value),
            mode: "insensitive",
          },
        });
      }
    }
  }

  return AND.length ? { AND } : {};
}

function buildSelect(columns: string[]): Record<string, boolean> {
  return Object.fromEntries(columns.map((column) => [column, true]));
}

async function runQuery(
  plan: AIQueryPlan,
  fields: string[]
): Promise<Record<string, unknown>[]> {
  const safeFilters = (plan.filters || []).filter((filter) => fields.includes(filter.field));
  const safeColumns = (plan.columns || []).filter((column) => fields.includes(column));

  const safeOrderBy =
    plan.orderBy && fields.includes(plan.orderBy.field)
      ? plan.orderBy
      : fields.includes("refund_amount")
        ? { field: "refund_amount", direction: "desc" as const }
        : undefined;

  const where = buildWhere(safeFilters);

  const select = buildSelect(
    safeColumns.length
      ? safeColumns
      : DEFAULT_COLUMNS.filter((column) => fields.includes(column))
  );

  try {
    const rows = await prisma.lmRecord.findMany({
      where,
      select,
      take: plan.limit || 100,
      orderBy: safeOrderBy
        ? {
            [safeOrderBy.field]: safeOrderBy.direction,
          }
        : undefined,
    });

    return rows as unknown as Record<string, unknown>[];
  } catch (error) {
    console.error("ERROR RUNQUERY IA:", error);
    return [];
  }
}

async function runSuggestions(fields: string[]): Promise<Record<string, unknown>[]> {
  const columns = DEFAULT_COLUMNS.filter((field) => fields.includes(field));

  try {
    const rows = await prisma.lmRecord.findMany({
      where: {
        AND: [
          fields.includes("management_status")
            ? {
                management_status: {
                  contains: "pendiente",
                  mode: "insensitive",
                },
              }
            : {},
          fields.includes("refund_amount")
            ? {
                refund_amount: {
                  gt: 0,
                },
              }
            : {},
        ],
      },
      select: buildSelect(columns),
      take: 300,
      orderBy: fields.includes("refund_amount")
        ? {
            refund_amount: "desc",
          }
        : undefined,
    });

    return (rows as unknown as Record<string, unknown>[])
      .filter((row) => {
        const hasCc = fields.includes("confirmation_cc")
          ? isTruthySi(row.confirmation_cc)
          : true;

        const hasPower = fields.includes("confirmation_power")
          ? isTruthySi(row.confirmation_power)
          : true;

        const hasEntity = fields.includes("entity")
          ? normalize(row.entity) && !normalize(row.entity).includes("pendiente")
          : true;

        const hasAmount = Number(row.refund_amount || 0) > 0;

        return hasCc && hasPower && hasEntity && hasAmount;
      })
      .slice(0, 100);
  } catch (error) {
    console.error("ERROR RUNSUGGESTIONS IA:", error);
    return [];
  }
}

function buildAnswer(plan: AIQueryPlan, rows: Record<string, unknown>[]): string {
  const totalMonto = rows.reduce(
    (acc, row) => acc + Number(row.refund_amount || 0),
    0
  );

  if (plan.answerHint && rows.length === 0) {
    return `${plan.answerHint} No encontré registros con esos filtros.`;
  }

  if (plan.intent === "suggest_management") {
    return `Encontré ${rows.length} casos que están en mejores condiciones para gestionar. Priorizo los que tienen monto, estado pendiente, entidad asignada, Confirmación CC y Confirmación Poder. Monto total aproximado: ${money(totalMonto)}.`;
  }

  if (plan.intent === "export_excel") {
    return `Preparé la última consulta para descarga en Excel. Hay ${rows.length} registros en el resultado actual.`;
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

    const fields = getLmRecordFields();
    const previous = memory.get(userId);

    let plan = await interpretWithOpenAI(message, fields, previous);
    plan = sanitizePlan(plan, fields);

    if (
      message.toLowerCase().includes("ahora") &&
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
        "No pude procesar la solicitud del CRM. Verifica que OPENAI_API_KEY o crm esté configurada en Railway y revisa los logs.",
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