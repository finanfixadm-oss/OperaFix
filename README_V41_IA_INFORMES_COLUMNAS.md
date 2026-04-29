# OperaFix v41 - IA para informes con columnas seleccionables

Esta versión mejora el módulo **IA para gestiones** para que el usuario pueda chatear con la IA y pedir informes indicando las columnas que quiere usar.

## Qué permite hacer

Ejemplos de prompts:

- `Dame un informe ejecutivo del mandante seleccionado`
- `Crea un informe con columnas RUT, Razón Social, Entidad, Estado Gestión, Monto Devolución y N° Solicitud`
- `Haz un listado de Optimiza Consulting con columnas RUT, Razón Social, AFP, Estado y Monto`
- `Informe de casos pendientes en AFP Modelo con RUT, Razón Social, Estado Gestión y Monto Devolución`
- `Qué informes puedo pedir y qué columnas puedo usar`

## Cambios principales

### Backend

Archivo modificado:

- `backend/src/routes/ai-actions.ts`

Incluye:

- Catálogo de columnas disponibles para informes.
- Detección de columnas solicitadas en lenguaje natural.
- Filtros automáticos por mandante, AFP, estado, pagado, rechazo, sin poder y sin CC.
- Generación de tabla de informe en respuesta del endpoint `/api/ai/chat`.
- Exportación de datos estructurados hacia el frontend.
- Mantiene OpenAI si existe `OPENAI_API_KEY`; si OpenAI falla, sigue funcionando con lógica local.

### Frontend

Archivo modificado:

- `frontend/src/pages/AiGestionesPage.tsx`

Incluye:

- Render de informe como tabla dentro del chat.
- Botón `Copiar tabla`.
- Botón `Descargar CSV`.
- Nuevos prompts rápidos para pedir informes y columnas.

### CSS

Archivo modificado:

- `frontend/src/styles/zoho-modules.css`

Incluye estilos para:

- tarjetas de informe IA,
- tablas con scroll,
- acciones de copiar/exportar.

## Variables necesarias

En Railway/backend:

```env
OPENAI_API_KEY=tu_api_key_de_railway
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_MODEL` es opcional.

## Deploy

```bash
git add .
git commit -m "v41 ia informes con columnas"
git push
```

Luego hacer redeploy en Railway si no se dispara automáticamente.
