# V70 - Carga inteligente alineada a BBDD CRM

Esta versión alinea la carga masiva inteligente con los campos oficiales del Excel `BBDD_CRM.xlsx` y con los módulos del CRM.

## Cambios principales

- Catálogo único de campos para carga masiva.
- Mapeo automático por alias, acentos y nombres similares.
- Vista previa dinámica con todos los campos mapeados.
- Carga a `managements` y respaldo en `lm_records` / `tp_records`.
- Campos faltantes agregados al schema Prisma para que IA, portal cliente, dashboard y registros consuman la misma estructura.

## Archivos principales modificados

- `backend/prisma/schema.prisma`
- `backend/src/routes/import-records.ts`
- `frontend/src/pages/MassImportPage.tsx`
- `backend/prisma/operafix_v70_add_crm_fields.sql`

## Pasos recomendados después de copiar

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npx prisma generate
npx prisma db push
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build

git add .
git commit -m "V70 align intelligent import with official CRM fields"
git push
```

## Alternativa si no quieres usar prisma db push

Ejecutar el SQL:

`backend/prisma/operafix_v70_add_crm_fields.sql`

contra la base PostgreSQL de Railway.
