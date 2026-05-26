# V84 - Dashboard Builder con campos reales de base de datos

Esta versión modifica solo el Dashboard Ejecutivo y su backend.

## Archivos incluidos

- `backend/src/routes/dashboard.ts`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/dashboard-executive-pro.css`

## Mejoras

- Nuevo endpoint `GET /api/dashboard/fields`.
- El constructor de paneles ahora puede consumir campos reales del CRM.
- Los campos se clasifican por tipo:
  - texto
  - número
  - monto
  - fecha
  - booleano
  - select
- Las medidas del panel usan campos numéricos/montos.
- Los agrupamientos usan campos de texto, fecha o booleanos.
- Los filtros del panel usan la lista de campos dinámica.
- Se mantiene compatibilidad con paneles ya guardados.
- Se mejoró visualmente el constructor de paneles.
- No se toca Portal Cliente, Registros, Usuarios ni Carga Masiva.

## Después de reemplazar

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V84 dashboard campos reales pro"
git push
```

Luego abrir el CRM con `Ctrl + F5`.
