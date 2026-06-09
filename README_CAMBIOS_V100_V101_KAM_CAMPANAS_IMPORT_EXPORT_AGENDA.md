# OperaFix V100/V101 - KAM Campañas, Importación/Exportación y Agenda Comercial

## Mejoras agregadas

### 1. Campañas comerciales
- Nuevo módulo/pestaña `Campañas / Excel` dentro del módulo KAM.
- Permite crear campañas comerciales con nombre, descripción, estado, fechas y objetivo de monto.
- Cada empresa KAM puede asociarse a una campaña.
- Dashboard por campaña con empresas, contactadas, interesadas, propuestas, ganadas, perdidas, monto potencial y monto ganado.

### 2. Importación masiva desde Excel
- Nueva carga masiva desde Excel para empresas KAM.
- Endpoint: `POST /api/kam/companies/import-excel`.
- Valida duplicados por RUT normalizado y razón social.
- Permite asociar la carga a una campaña.
- Columnas aceptadas: RUT, Razón Social, Nro Empleados, Monto Devolución, Rubro, Región, Contacto, Cargo, Correo, Teléfono, Teléfono central, LinkedIn y Observación.

### 3. Exportación a Excel
- Nuevo botón `Exportar Excel` en el módulo KAM.
- Endpoint: `POST /api/kam/companies/export-excel`.
- Exporta empresas con filtros comerciales: estado, rubro, región, prioridad y campaña.

### 4. Agenda comercial y alertas
- Nueva pestaña `Agenda`.
- Muestra gestiones vencidas, gestiones de hoy, gestiones de mañana, próximas gestiones y empresas sin primer contacto.
- El KAM vendedor ve solo su cartera; KAM administrador ve todo.

### 5. Integración con lo ya existente
- Mantiene Kanban drag & drop.
- Mantiene contactos múltiples y LinkedIn.
- Mantiene dashboard KAM administrador.
- Mantiene validación de próxima gestión y motivo de pérdida.
- Mantiene bloqueo de duplicados.

## Base de datos
El backend crea automáticamente la tabla `operafix_kam_campaigns` y la columna `campaign_id` cuando se usa el módulo KAM.
También se incluye el SQL opcional:

```text
/database/13_kam_campaigns_import_export_agenda.sql
```

## Comandos

Backend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npx prisma generate
npm run build
```

Frontend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```

## Nota de validación
El build frontend fue validado correctamente. El build backend requiere `npx prisma generate`; en este entorno no se pudo completar porque Prisma intentó descargar binarios desde internet, pero `kam.ts` no generó errores TypeScript propios en la compilación.
