import express from "express";
import OpenAI from "openai";
import { Prisma, PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

const apiKey = process.env.OPENAI_API_KEY || process.env.crm || "";
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

function getLmRecordFields(): string[] {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "LmRecord");
  return model?.fields.map((f) => f.name) || [];
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

function isTruthySi(value: unknown): boolean {
  const v = normalize(value);

  return (
    v === "si" ||
    v === "sí" ||
    v === "true" ||
    v === "1" ||
    v.includes("si")
  );
}

function normalizeBooleanValue(field: string, value: unknown): unknown {
  const booleanFields = ["confirmation_cc", "confirmation_power"];

  if (!booleanFields.includes(field)) {
    return value;
  }

  const normalized = normalize(value);

  if (
    normalized === "si" ||
    normalized === "sí" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized.includes("confirmado")
  ) {
    return true;
  }

  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "0" ||
    normalized.includes("pendiente")
  ) {
    return false;
  }

  return value;
}

function parseLocalIntent(message: string, fields: string[]): Partial<AIQueryPlan> {
  const q = normalize(message);
  const filters: AIFieldFilter[] = [];

  if (q.includes("pendiente")) {
    filters.push({
      field: "management_status",
      operator: "contains",
      value: "pendiente",
    });
  }

  if (q.includes("pagado") || q.includes("pagada")) {
    filters.push({
      field: "management_status",
      operator: "contains",
      value: "pag",
    });
  }

  if (q.includes("rechaz")) {
    filters.push({
      field: "management_status",
      operator: "contains",
      value: "rechaz",
    });
  }

  if (
    q.includes("cc si") ||
    q.includes("cc = si") ||
    q.includes("confirmacion cc si") ||
    q.includes("confirmacion cc = si") ||
    q.includes("cuenta corriente si")
  ) {
    filters.push({
      field: "confirmation_cc",
      operator: "equals",
      value: true,
    });
  }

  if (
    q.includes("poder si") ||
    q.includes("poder = si") ||
    q.includes("confirmacion poder si") ||
    q.includes("confirmacion poder = si")
  ) {
    filters.push({
      field: "confirmation_power",
      operator: "equals",
      value: true,
    });
  }

  const amountMatch = q.match(
    /(?:sobre|mayor a|mas de|más de|>=|>)\s*\$?\s*([\d\.]+)/
  );

  if (amountMatch) {
    filters.push({
      field: "refund_amount",
      operator: "gt",
      value: Number(amountMatch[1].replace(/\./g, "")),
    });
  }

  const afps = [
    "modelo",
    "capital",
    "habitat",
    "provida",
    "cuprum",
    "planvital",
    "uno",
  ];

  for (const afp of afps) {
    if (q.includes(afp)) {
      filters.push({
        field: "entity",
        operator: "contains",
        value: afp,
      });
    }
  }

  const possibleMandantes = [
    "mundo previsional",
    "mundo",
    "previsional",
    "optimiza",
    "optmiza",
    "optimisa",
    "finanfix",
  ];

  for (const mandante of possibleMandantes) {
    if (q.includes(mandante)) {
      const value =
        mandante.includes("mundo") || mandante.includes("previsional")
          ? "mundo previsional"
          : mandante.includes("optim")
            ? "optimiza"
            : mandante;

      filters.push({
        field: "mandante",
        operator: "contains",
        value,
      });

      break;
    }
  }

  const columns = [...DEFAULT_COLUMNS].filter((field) => fields.includes(field));

  return {
    intent:
      q.includes("excel") || q.includes("descarg")
        ? "export_excel"
        : q.includes("gestionar primero") || q.includes("listos para gestionar")
          ? "suggest_management"
          : "query_records",
    filters: filters.filter((f) => fields.includes(f.field)),
    columns,
    orderBy: fields.includes("refund_amount")
      ? { field: "refund_amount", direction: "desc" }
      : undefined,
    limit: 100,
  };
}

async function interpretWithOpenAI(
  message: string,
  fields: string[],
  previous?: ChatMemory
): Promise<AIQueryPlan> {
  if (!apiKey) {
    const local = parseLocalIntent(message, fields);

    return {
      intent: local.intent || "query_records",
      filters: local.filters || [],
      columns: local.columns || DEFAULT_COLUMNS.filter((f) => fields.includes(f)),
      orderBy: local.orderBy,
      limit: local.limit || 100,
      answerHint: "OpenAI no está configurado; se usó interpretación local.",
    };
  }

  const system = `
Eres el chat inteligente de OperaFix, un CRM de recuperación previsional.

Tu trabajo es conversar como ChatGPT, pero conectado al CRM.

Debes interpretar la solicitud del usuario y devolver SOLO JSON válido.

Puedes entender errores ortográficos:
- "mundo", "previsional", "mundo previsonal" => Mandante Mundo Previsional
- "optmiza", "optimisa" => Optimiza
- "cc" => Confirmación CC
- "poder" => Confirmación Poder
- "plata", "lucas", "monto" => Monto Devolución

Campos disponibles reales:
${fields.join(", ")}

Campos recomendados de salida si el usuario no especifica:
${DEFAULT_COLUMNS.filter((f) => fields.includes(f)).join(", ")}

Nunca inventes campos. Si el usuario pide "todos los campos", usa todos los campos disponibles.

Devuelve este JSON:
{
  "intent": "query_records" | "aggregate" | "export_excel" | "suggest_management" | "general_answer",
  "filters": [
    { "field": "campo_real", "operator": "contains|equals|gt|gte|lt|lte", "value": "valor" }
  ],
  "columns": ["campo_real"],
  "orderBy": { "field": "campo_real", "direction": "asc|desc" },
  "groupBy": ["campo_real"],
  "limit": 100,
  "answerHint": "respuesta breve en español natural"
}

Reglas:
- Si el usuario dice "ahora", usa el contexto anterior.
- Si pide Excel, intent debe ser export_excel.
- Si pide casos listos para gestionar, intent debe ser suggest_management.
- Casos listos para gestionar = pendiente + CC sí + poder sí + monto devolución mayor a 0 + entidad asignada.
- Si el usuario dice Confirmación CC Sí, cc sí, CC = Sí o cuenta corriente sí, usa field "confirmation_cc", operator "equals", value true.
- Si el usuario dice Confirmación Poder Sí, poder sí o poder = Sí, usa field "confirmation_power", operator "equals", value true.
`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.1,
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

  const filters = (plan.filters || []).filter((filter) =>
    fieldSet.has(filter.field)
  );

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
    const value = normalizeBooleanValue(field, filter.value);

    if (operator === "contains") {
      AND.push({
        [field]: {
          contains: String(value),
          mode: "insensitive",
        },
      });
    }

    if (operator === "equals") {
      AND.push({
        [field]: value,
      });
    }

    if (
      operator === "gt" ||
      operator === "gte" ||
      operator === "lt" ||
      operator === "lte"
    ) {
      AND.push({
        [field]: {
          [operator]: Number(value),
        },
      });
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
  const safeFilters = (plan.filters || []).filter((filter) =>
    fields.includes(filter.field)
  );

  const safeColumns = (plan.columns || []).filter((column) =>
    fields.includes(column)
  );

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

    return res.status(500).json({
      success: false,
      answer: "No pude procesar la solicitud del CRM.",
      error: error instanceof Error ? error.message : "Error desconocido",
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