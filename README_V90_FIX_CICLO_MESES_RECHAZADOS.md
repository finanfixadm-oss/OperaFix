# V90 - Fix ciclo operativo, meses y rechazados

Este paquete corrige dos problemas:

1. El Dashboard no mostraba correctamente meses como `Junio` porque `/api/records` no devolvía `mes_ingreso_solicitud` desde `request_entry_month`.
2. Los casos rechazados no deben formar parte de la proyección/materialización/arrastre del Dashboard ni del Portal Cliente.

## Archivos incluidos

- `backend/src/routes/records.ts`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/ClientPortalPage.tsx`

## Reglas aplicadas

- `Mes de ingreso solicitud` = proyección.
- `Mes de producción 2026` = materialización.
- Los registros con estado o motivo que contenga `rechaz` quedan excluidos de:
  - Proyectado del ciclo.
  - Materializado del ciclo.
  - Pasa al mes siguiente.
  - Arrastre acumulado.
  - Ranking de proyección por AFP.
  - Ranking de materializado por AFP.
- El listado de meses en Dashboard ahora usa también `request_entry_month` / `mes_ingreso_solicitud`.

## Aplicación

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V90 fix dashboard portal meses rechazados"
git push
```

Luego abrir con `Ctrl + F5`.
