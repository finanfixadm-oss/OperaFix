import OpenAI from "openai";

const apiKey =
  process.env.OPENAI_API_KEY ||
  process.env.crm ||
  process.env.CRM ||
  "";

const client = new OpenAI({
  apiKey: apiKey || "dummy",
});

export type CRMInterpretation = {
  intent:
    | "query_records"
    | "aggregate"
    | "export_excel"
    | "suggest_management"
    | "general_answer";
  filters: {
    field: string;
    operator: "contains" | "equals" | "gt" | "gte" | "lt" | "lte";
    value: string | number | boolean;
  }[];
  columns: string[];
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
  };
  groupBy?: string[];
  limit?: number;
  answerHint?: string;
};

export async function interpretCRMQuery(
  message: string,
  schemaFields: string[],
  memory?: any
): Promise<CRMInterpretation> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY, crm o CRM no está configurada.");
  }

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
Eres el motor IA conversacional de OperaFix.

Tu trabajo es comportarte como ChatGPT conectado al CRM.

Debes:
- interpretar lenguaje natural
- corregir errores ortográficos
- entender frases incompletas
- entender mandantes, AFP, estados, montos, fechas y campos operacionales
- convertir la petición en JSON válido para consultar el CRM
- usar SOLO campos disponibles
- no inventar campos
- no cambiar la intención del usuario

Campos disponibles:
${schemaFields.join(", ")}

Equivalencias importantes:
- Confirmación CC, CC, cuenta corriente => confirmation_cc
- Confirmación Poder, poder => confirmation_power
- Estado Gestión, estado, gestión => management_status
- AFP, entidad, administradora => entity
- Monto, plata, devolución, lucas => refund_amount
- Razón Social, empresa, compañía => business_name
- Grupo empresa, grupo => search_group
- N° Solicitud, número solicitud, solicitud => request_number
- Mundo, Previsional, Mundo Previsional, mundo previsonal => mandante
- Optimiza, Optmiza, Optimisa => mandante
- Capital, AFP Capital => entity
- Modelo, AFP Modelo => entity
- Habitat, AFP Habitat => entity
- Provida, AFP Provida => entity
- Cuprum, AFP Cuprum => entity
- Planvital, AFP Planvital => entity
- Uno, AFP Uno => entity
- Gestionado, gestionada => management_status
- Pendiente, pendiente gestión => management_status
- Pagado, pagada => management_status
- Rechazado, rechazo => management_status

Reglas:
- Para textos usa operator "contains".
- Para booleanos usa operator "equals" con true o false.
- Para montos usa gt, gte, lt o lte cuando corresponda.
- Si el usuario pide Excel o descargar, intent debe ser "export_excel".
- Si el usuario pide sugerencias, priorización, casos listos o qué gestionar primero, intent debe ser "suggest_management".
- Si el usuario pide una búsqueda/listado, intent debe ser "query_records".
- Si el usuario dice "ahora", usa el contexto anterior en memory.
- Si no pide columnas específicas, usa columnas principales.

Columnas principales sugeridas:
mandante, business_name, rut, entity, management_status, refund_amount, confirmation_cc, confirmation_power, request_number

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
        `,
      },
      {
        role: "user",
        content: JSON.stringify({
          message,
          memory,
        }),
      },
    ],
  });

  const raw = response.choices[0]?.message?.content || "{}";

  return JSON.parse(raw) as CRMInterpretation;
}