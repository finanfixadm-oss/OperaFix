# OperaFix v25 - Campos dinámicos en Registros y Dashboard

## Cambios principales

### Registros de empresas
- Nuevo botón **Campos / columnas**.
- Permite elegir qué columnas mostrar.
- Permite **Mostrar todos** los campos disponibles.
- Permite volver a la **Vista estándar**.
- El panel de filtros ahora usa todos los campos disponibles del registro.
- La búsqueda rápida busca en todos los campos configurados.

### Dashboard ejecutivo
- Nuevo botón **Campos / columnas**.
- Se agregó filtro avanzado por cualquier campo.
- Se agregó tabla dinámica de detalle del dashboard.
- Exportar CSV ahora exporta las columnas visibles seleccionadas.

### Nuevo archivo
- `frontend/src/utils-record-fields.ts`
  - Centraliza la definición de todos los campos disponibles.
  - Evita duplicar columnas/filtros entre dashboard y registros.

## Archivos modificados
- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/styles/zoho-modules.css`

## Deploy

```powershell
git add .
git commit -m "v25 campos dinamicos dashboard registros"
git push
```
