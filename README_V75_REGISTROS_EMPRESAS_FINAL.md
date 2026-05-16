# OperaFix V75 - Registros Empresas PRO Final

Esta entrega modifica solo el módulo **Registros de empresas** y sus componentes visuales.

## Regla oficial Listo para gestionar

Un caso está listo para gestionar solo si cumple las 4 condiciones:

- Confirmación Poder = true / Sí
- Confirmación CC = true / Sí
- Monto Devolución > 0
- Estado Gestión contiene "Pendiente"

## Archivos incluidos

- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/components/records/RecordDetailPanel.tsx`
- `frontend/src/components/records/RecordPriorityBadge.tsx`
- `frontend/src/styles/zoho-modules.css`

## Mejoras

- Corrección definitiva de conteo y filtro "Listos para gestionar".
- Panel lateral de detalle más completo.
- Análisis operacional por caso.
- Badges de prioridad coherentes con la regla de negocio.
- Tabla con scroll, columnas sticky y contenedor redimensionable.
- Estilos solo para Registros de empresas.

## Instalación

Reemplazar los archivos incluidos y ejecutar:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd ..
git add .
git commit -m "V75 registros empresas pro final"
git push
```

Después del deploy, usar `Ctrl + F5`.
