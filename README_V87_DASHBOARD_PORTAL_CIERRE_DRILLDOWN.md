# V87 - Dashboard + Portal Cliente con cierre configurable y detalle de proyección

Esta versión agrega la lógica de proyección/materialización también al Portal Cliente y mejora el Dashboard Ejecutivo.

## Conceptos aplicados

- **Mes de ingreso solicitud** = proyección del mes.
- **Mes de producción 2026** = materialización cuando el caso se pagó/cerró/facturó.
- **Día de cierre** configurable por usuario.
- Ciclo operacional: desde el día siguiente al cierre anterior hasta el día de cierre del mes seleccionado.

Ejemplo con cierre día 25:

- Ciclo junio = 26 de mayo al 25 de junio.

## Dashboard Ejecutivo

- Día de cierre editable.
- Cierre persistente en `localStorage`.
- KPIs clickeables:
  - Proyectado ingreso solicitud.
  - Materializado producción 2026.
  - Pasa al mes siguiente.
  - Arrastre acumulado.
- Panel lateral con registros que componen cada KPI.
- Exportación CSV del detalle.

## Portal Cliente

- Misma lógica de cierre que el Dashboard.
- Selector de mes de cierre operacional.
- Día de cierre editable.
- KPIs de proyección/materialización visibles para el cliente.
- Panel lateral con detalle de registros por KPI.
- Exportación CSV del detalle.
- Ranking de proyección y materialización por AFP.

## Archivos incluidos

- `backend/src/routes/portal.ts`
- `frontend/src/pages/ClientPortalPage.tsx`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/dashboard-executive-pro.css`
- `frontend/src/styles/zoho-modules.css`

## Aplicación

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V87 dashboard portal cierre drilldown"
git push
```

Después del deploy, cerrar sesión si corresponde y abrir con `Ctrl + F5`.
