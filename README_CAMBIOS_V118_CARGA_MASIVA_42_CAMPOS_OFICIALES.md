# OperaFix V118 - Carga Masiva 42 Campos Oficiales CRM

Este fix deja el CRM compatible con la estructura oficial de carga masiva definida en el PDF **Estructura de Campos para Carga Masiva en CRM**.

## Cambios principales

### Backend
- Se agregó el campo `porcentaje_liquidaciones` en:
  - `managements`
  - `lm_records`
  - `tp_records`
- Se agregó migración SQL:
  - `database/15_carga_masiva_42_campos_oficiales.sql`
- Se actualizó Prisma:
  - `backend/prisma/schema.prisma`
- Se actualizó el importador masivo:
  - `backend/src/routes/import-records.ts`
- Se agregaron alias de cabeceras oficiales:
  - `Holding` -> `grupo_empresa`
  - `Monto estimado` -> `monto_devolucion`
  - `Monto estimado cliente` -> `monto_cliente`
  - `Confirmación Poder Notarial` -> `confirmacion_poder`
  - `Porcentaje de liquidaciones` -> `porcentaje_liquidaciones`
- Se agregó validación estricta para campos desplegables oficiales:
  - Estado contrato con cliente
  - Motivo tipo de exceso
  - Entidad
  - Envío AFP
  - Estado Gestión
  - Acceso portal
  - Porcentaje de liquidaciones
  - Facturado Finanfix
  - Facturado cliente
  - Consulta CEN
  - Contenido CEN
  - Respuesta CEN

### Frontend
- Se agregó `porcentaje_liquidaciones` en tipos, grillas, filtros y detalle.
- Se renombraron etiquetas visibles para calzar con el archivo oficial:
  - `Monto Devolución` ahora se muestra como `Monto estimado`.
  - `Monto cliente` ahora se muestra como `Monto estimado cliente`.
  - `Buscar Grupo` ahora se muestra como `Holding / Grupo empresa`.
  - `Confirmación Poder` se muestra como `Confirmación Poder Notarial`.
- Se agregó el campo en formulario de creación/edición de registros.
- Se agregó el campo en ficha completa y panel lateral.
- Se agregó el campo en carga masiva como columna prioritaria de revisión.

## Comandos recomendados

### Backend

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npx prisma generate
npm run build
```

### Frontend

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm run build
```

### Base de datos Railway / PostgreSQL

Ejecutar el SQL:

```sql
ALTER TABLE IF EXISTS managements ADD COLUMN IF NOT EXISTS porcentaje_liquidaciones text;
ALTER TABLE IF EXISTS lm_records ADD COLUMN IF NOT EXISTS porcentaje_liquidaciones text;
ALTER TABLE IF EXISTS tp_records ADD COLUMN IF NOT EXISTS porcentaje_liquidaciones text;
```

O ejecutar el archivo completo:

```powershell
psql "$env:DATABASE_URL" -f ..\database\15_carga_masiva_42_campos_oficiales.sql
```

## Validación realizada

- Backend: `npm run build` OK.
- Frontend: `npm run build` OK después de reinstalar dependencias limpias.
