# OperaFix v38 - IA que ejecuta acciones

Esta versión convierte el módulo **IA para gestiones** en un chat operativo conectado al CRM.

## Incluye

- Chat IA real en `/ia-gestiones`.
- Contexto por mandante.
- Endpoint backend `POST /api/ai/chat`.
- Endpoint seguro `POST /api/ai/execute`.
- Acciones propuestas por la IA con confirmación obligatoria.
- Trazabilidad en cronología/actividades.
- Fallback local si no hay `OPENAI_API_KEY` o si OpenAI no responde.

## Acciones soportadas

- Cambiar Estado Gestión.
- Agregar nota a la gestión.
- Crear tarea/actividad pendiente.
- Actualizar confirmación CC/Poder.
- Crear borrador de correo en cronología.

## Configuración

En `backend/.env` o Railway Variables:

```env
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-4o-mini
```

Si no configuras `OPENAI_API_KEY`, el módulo igual funciona con análisis local basado en reglas, pero no con modelo generativo externo.

## Archivos modificados

- `backend/src/routes/ai-actions.ts` nuevo.
- `backend/src/app.ts` registra `/api/ai`.
- `frontend/src/pages/AiGestionesPage.tsx` reemplazado por chat IA.
- `frontend/src/styles/zoho-modules.css` agrega estilos del chat y acciones.
- `backend/.env.example` agrega variables de OpenAI.

## Uso seguro

La IA nunca cambia datos automáticamente. Primero propone acciones. El usuario debe presionar **Ejecutar** y confirmar.
