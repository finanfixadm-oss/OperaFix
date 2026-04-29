# OperaFix v51 — IA OpenAI obligatoria GPT-5.5

Esta versión elimina el modo local/fallback del módulo IA.

## Cambios clave

- La IA **siempre** usa OpenAI.
- Modelo por defecto: `gpt-5.5`.
- Usa `OPENAI_API_KEY` desde Railway/backend.
- Si falta la key o OpenAI falla, el sistema devuelve un error claro.
- Ya no responde `Motor: local`.
- Los informes descargables siguen construyéndose con datos reales del CRM para respetar columnas/filtros, pero la respuesta conversacional se genera con GPT-5.5.

## Variables Railway requeridas

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
```

`OPENAI_MODEL` es opcional; si no existe, usa `gpt-5.5`.

## Validación esperada

En el chat IA debe aparecer:

```txt
source: openai
engine: OpenAI gpt-5.5
```

Si sale error, revisar Railway > Variables y hacer Redeploy.
