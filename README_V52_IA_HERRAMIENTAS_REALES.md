# OperaFix v52 — IA con herramientas reales (Function Calling)

Esta versión convierte la IA en un agente con herramientas reales del CRM usando OpenAI Responses API y `model: gpt-5.5`.

## Cambios principales

- Sin fallback local.
- Usa `OPENAI_API_KEY` desde Railway/backend.
- Usa `OPENAI_MODEL=gpt-5.5` por defecto.
- Agrega tool/function calling interno para:
  - `crm_buscar_gestiones`
  - `crm_crear_informe_excel`
  - `crm_detectar_oportunidades`
  - `crm_preparar_acciones`
- Cuando pides informes por columnas, la IA llama a una herramienta que construye el reporte con datos reales.
- Cuando pides oportunidades/plata/lucas, la IA llama a la herramienta de oportunidades.
- Cuando pides acciones, la IA prepara acciones confirmables, sin ejecutarlas automáticamente.

## Ejemplos de uso

- `Dame las gestiones de Mundo Previsional`
- `Muéstrame RUT, Razón Social, AFP, Monto y Estado separado por mandante`
- `Quiero un Excel con Razón Social, RUT, Entidad, Estado Gestión, Monto Devolución y N° Solicitud de Mundo Previsional`
- `Qué lucas tengo más urgentes por gestionar esta semana`
- `Prepara acciones para casos sin poder y sin CC`

## Variables Railway

Debe existir:

```env
OPENAI_API_KEY=sk-...
```

Opcional:

```env
OPENAI_MODEL=gpt-5.5
```

## Deploy

```bash
cd backend
npm run build
cd ../frontend
npm run build
git add .
git commit -m "v52 IA con herramientas reales"
git push
```

Luego hacer Redeploy en Railway si no se ejecuta automáticamente.
