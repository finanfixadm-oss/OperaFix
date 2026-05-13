
import OpenAI from "openai";

const client = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY ||
    process.env.crm ||
    "",
});

export async function interpretCRMQuery(
  message: string,
  schemaFields: string[],
  memory?: any
) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
Eres el motor IA conversacional de OperaFix.

Debes:
- interpretar lenguaje natural
- corregir errores ortográficos
- entender mandantes, AFP y estados
- utilizar TODOS los campos disponibles del CRM
- responder SIEMPRE JSON válido

Campos disponibles:
${schemaFields.join(", ")}
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

  return JSON.parse(
    response.choices[0].message.content || "{}"
  );
}
