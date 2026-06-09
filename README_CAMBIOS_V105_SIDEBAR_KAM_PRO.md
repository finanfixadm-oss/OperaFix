# OperaFix V105 - Sidebar Profesional KAM con Menús Desplegables

Esta versión reorganiza la navegación del módulo KAM para que la interfaz se vea más profesional y menos saturada.

## Cambios principales

- Se movieron las acciones que estaban acumuladas en la barra superior del módulo KAM hacia un menú lateral ordenado.
- Se agregó un menú lateral interno para KAM con grupos desplegables:
  - Comercial KAM
  - Acciones
  - Análisis
  - Configuración
- Se agregaron accesos a:
  - Dashboard KAM
  - Empresas
  - Kanban
  - Agenda
  - Nueva empresa
  - Registrar gestión
  - Exportar filtrado
  - Campañas / Excel
  - Ranking KAM
  - Reglas
- Se mantuvo el botón rápido `+ Nueva empresa` en el encabezado como acción principal.
- Se mejoró la navegación lateral global de OperaFix, agrupando las opciones KAM con menús desplegables.
- Se agregó soporte para abrir vistas KAM por URL usando `?tab=...`, por ejemplo:
  - `/kam-asignacion?tab=tracking`
  - `/kam-asignacion?tab=companies`
  - `/kam-asignacion?tab=kanban`
  - `/kam-asignacion?tab=agenda`
  - `/kam-asignacion?tab=campaigns`
  - `/kam-asignacion?tab=profiles`
  - `/kam-asignacion?tab=rules`
- Se agregaron estilos visuales para:
  - grupos desplegables,
  - opción activa,
  - hover,
  - icono OperaFix,
  - sidebar KAM sticky,
  - estructura responsive.

## Archivos modificados

- `frontend/src/pages/KamAssignmentPage.tsx`
- `frontend/src/pages/kam-visual-pro.css`
- `frontend/src/components/Layout.tsx`
- `frontend/src/styles/zoho-modules.css`

## Comandos recomendados

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

## Nota

En este entorno no fue posible validar el build del frontend porque el ZIP no incluye `node_modules` y faltan las dependencias locales de React/TypeScript. Los cambios están aplicados sobre la V104.
