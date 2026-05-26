# V85 - Fix Dashboard Builder con datos reales

Este paquete corrige el problema del constructor de paneles del Dashboard cuando seleccionas campos reales de la base de datos y el gráfico muestra `$0`.

## Qué corrige

- El builder ahora lee los valores reales aunque vengan con nombres legacy o normalizados.
- Los montos se parsean correctamente aunque vengan como string, con `$`, puntos o formato CLP.
- `Monto real cliente` usa `actual_client_amount` y, si viene vacío, usa `monto_cliente/client_amount`.
- `Monto real Finanfix Solutions` usa `actual_finanfix_amount` y, si viene vacío, usa `monto_finanfix_solutions/finanfix_amount`.
- Si no existe monto Finanfix pero existe `Monto Devolución` + `FEE`, calcula la ganancia estimada.
- Las dimensiones ya no mezclan campos numéricos como agrupables.
- El endpoint dashboard mantiene campos reales de base de datos.

## Archivos incluidos

- `backend/src/routes/dashboard.ts`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/dashboard-executive-pro.css`

## Aplicación

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V85 fix dashboard builder datos reales"
git push
```

Luego abrir con `Ctrl + F5`.
