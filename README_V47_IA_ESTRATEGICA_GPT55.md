# OperaFix v47 — IA estratégica GPT-5.5

## Cambios principales

- IA configurada por defecto con `gpt-5.5` usando `OPENAI_API_KEY` desde Railway.
- No hay API key escrita en el código.
- La IA entiende lenguaje informal y solicitudes poco estructuradas: "sácame", "plata", "lucas", "dame la pega", etc.
- El módulo IA ahora pregunta/guarda quién eres y tu rol para responder mejor y cuidar acciones operativas.
- Informes por columnas más seguros: si pides Excel o columnas, el sistema genera tabla determinística y descarga `.xls` desde el chat.
- Evita respuestas genéricas tipo "abre Excel" cuando el usuario pide informes descargables.
- Mantiene acciones con confirmación: estado, nota, tarea, confirmaciones y borrador de correo.

## Railway

Variables requeridas:

```env
OPENAI_API_KEY=tu_nueva_key
OPENAI_MODEL=gpt-5.5
```

`OPENAI_MODEL` es opcional porque v47 usa `gpt-5.5` por defecto.

## Pruebas sugeridas

- "Sácame un Excel de Mundo Previsional con Razón Social, RUT, Entidad, Estado Gestión, Monto Devolución y N° Solicitud"
- "Dónde está la plata en Optimiza"
- "Dame la pega ordenada para hoy"
- "Soy Gabriel, producción. Qué debo priorizar esta semana"
- "Crea tareas para los casos sin poder"
