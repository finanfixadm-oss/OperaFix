# OperaFix v39 - Fix IA acciones / columnas Railway

## Qué corrige

El error:

`The column managements.mes_ingreso_solicitud does not exist in the current database`

ocurría porque el endpoint `/api/ai/chat` usaba `prisma.management.findMany()`. Prisma intenta leer todas las columnas definidas en el schema, aunque Railway todavía no tenga alguna columna creada.

## Cambio aplicado

Se reemplazó la carga de datos de IA por consultas compatibles con Railway:

- Detecta columnas existentes en `information_schema.columns`.
- Lee solo columnas que existen realmente en la base.
- Hace fallback a `lm_records` y `tp_records` si `managements` no está completo.
- Mantiene análisis local si OpenAI no está configurado.
- Mantiene acciones con confirmación.
- Evita que `/api/ai/chat` caiga con error 500 por columnas faltantes.

## Archivo principal modificado

- `backend/src/routes/ai-actions.ts`

## Deploy

```bash
git add .
git commit -m "fix ia chat compatible railway"
git push
```

Luego esperar el redeploy de Railway.
