# OperaFix V104 - Visual CRM Pro + Popups + Bitácora + Exportación filtrada

## Cambios principales

### 1. Exportar solo lo filtrado
- El botón de exportación ahora envía al backend únicamente los IDs de las empresas que están visibles según los filtros aplicados.
- Respeta búsqueda, KAM, estado, rubro, región, prioridad, tamaño, campaña y vista rápida.
- El archivo generado se descarga como `empresas_kam_filtradas.xlsx`.

### 2. Registrar gestión en popup
- Se agregó acción rápida **Registrar gestión**.
- Puede abrirse desde la barra superior o desde la fila de una empresa.
- Guarda la gestión en la bitácora comercial.
- Muestra las últimas gestiones dentro del modal.

### 3. Crear empresa en popup profesional
- Se agregó botón **Nueva empresa**.
- Abre un modal CRM para crear una empresa sin tener que refrescar la página.
- Permite crear datos de empresa, asignación comercial, contacto principal y contactos adicionales.

### 4. Editar empresa en popup
- Al presionar **Editar**, la empresa abre en un modal profesional.
- Evita que quede seleccionada una empresa antigua y mejora el flujo visual.

### 5. Branding OperaFix
- Se agregaron los logos entregados por el usuario en `frontend/public`.
- Se mejoró el encabezado superior y el sidebar.
- Se agregó marca visual `OperaFix CRM` en el menú lateral.

### 6. Contactos múltiples
- Se mantiene la funcionalidad para agregar más de un contacto por empresa.
- En creación de empresa se pueden agregar 1, 2, 3, 4 o más contactos antes de guardar.

## Archivos modificados
- `frontend/src/pages/KamAssignmentPage.tsx`
- `frontend/src/pages/kam-visual-pro.css`
- `frontend/src/components/Layout.tsx`
- `frontend/src/styles/zoho-modules.css`
- `backend/src/routes/kam.ts`

## Assets agregados
- `frontend/public/operafix-icon-color.png`
- `frontend/public/operafix-logo-white.png`
- `frontend/public/operafix-icon-white.png`

## Validación
- Frontend validado con `npm install` y `npm run build`.
- Backend requiere ejecutar `npx prisma generate` en un entorno con acceso a los binarios de Prisma antes del build.
