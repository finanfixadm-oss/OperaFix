# V88 - Cierre mensual configurable dentro del panel + meses predeterminados

Este paquete corrige los puntos solicitados:

## Dashboard Ejecutivo

- El selector **Mes cierre operacional** y el campo **Día cierre** ahora están dentro del bloque principal de **Cierre mensual configurable**.
- El texto del ciclo ya no queda fijo: se calcula dinámicamente según el mes y el día de cierre seleccionado.
- El cierre usa el día configurable, no solo el día 25.
- El día de cierre se guarda en `localStorage`.
- El bloque muestra dinámicamente:
  - Mes de cierre operacional
  - Día de cierre
  - Ciclo desde / hasta
  - Días restantes para cierre

## Portal Cliente

- Se agrega la misma lógica de cierre mensual configurable.
- El cliente puede ver proyección vs materialización.
- Puede descargar el detalle de:
  - Proyectado
  - Materializado
  - Pasa al mes siguiente
  - Arrastre acumulado
- El ciclo se calcula dinámicamente según mes y día de cierre.

## Registro / Ficha de gestión

- `Mes de producción 2026` deja de ser texto libre y ahora es selector predeterminado de meses.
- `Mes de ingreso solicitud` deja de ser texto libre y ahora es selector predeterminado de meses.

## Crear Registro de empresa

- Los campos:
  - `Mes de producción 2026`
  - `Mes de ingreso solicitud`
- ahora son listas predeterminadas de meses.

## Archivos incluidos

- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/ClientPortalPage.tsx`
- `frontend/src/pages/RecordDetailPage.tsx`
- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/pages/dashboard-executive-pro.css`
- `frontend/src/styles/zoho-modules.css`

## Validación

Se validó TypeScript con:

```powershell
cd frontend
npx tsc -b
```

## Aplicación

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V88 cierre configurable y meses predeterminados"
git push
```

Después del deploy abrir con `Ctrl + F5`.
