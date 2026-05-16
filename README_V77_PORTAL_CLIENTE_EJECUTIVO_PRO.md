# V77 - Portal Cliente Ejecutivo PRO

Este paquete modifica solo el Portal Cliente.

## Archivos incluidos

- `frontend/src/pages/ClientPortalPage.tsx`
- `frontend/src/styles/zoho-modules.css`

## Mejoras

- Portal Cliente más parecido a Registros de empresas + Dashboard.
- KPIs ejecutivos para el cliente.
- Gráficos visuales sin dependencias externas.
- Resumen por AFP clickeable.
- Filtros rápidos: listos, pendientes, pagados, rechazados, falta poder, falta CC, alto monto.
- Vista ejecutiva, tarjetas, kanban y tabla.
- Tabla con scroll horizontal/vertical y detalle.
- Panel lateral de detalle del caso.
- Descarga de Excel/CSV de la vista filtrada.
- Descarga de informe ejecutivo HTML compatible con impresión/PDF.
- No modifica Dashboard, Registros, App, main, Layout ni backend.

## Instalación

Reemplaza los archivos incluidos en tu proyecto y ejecuta:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd ..
git add .
git commit -m "V77 portal cliente ejecutivo pro"
git push
```

Después del deploy, abre con Ctrl + F5.
