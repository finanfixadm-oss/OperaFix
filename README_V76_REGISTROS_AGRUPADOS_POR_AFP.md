# V76 - Registros agrupados por AFP

Esta entrega modifica solo el módulo Registros de empresas.

## Archivos incluidos

- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/components/records/RecordsAfpSummary.tsx`
- `frontend/src/styles/zoho-modules.css`

## Qué agrega

- Resumen por AFP sobre la tabla de Registros.
- Monto total por AFP.
- Cantidad de casos por AFP.
- Cantidad de listos, pendientes, pagados, sin poder y sin CC por AFP.
- Click en la AFP o monto para filtrar la tabla por esa entidad.
- Botón `Limpiar AFP` para volver a ver todas.
- Respeta filtros activos: mandante, búsqueda, filtros avanzados y filtros rápidos.
- No modifica Dashboard ni Portal Cliente.

## Regla de listo para gestionar

Un caso está listo solo si:

- Confirmación Poder = Sí
- Confirmación CC = Sí
- Monto Devolución > 0
- Estado Gestión contiene `pendiente`

## Comandos

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd ..
git add .
git commit -m "V76 registros agrupados por AFP"
git push
```
