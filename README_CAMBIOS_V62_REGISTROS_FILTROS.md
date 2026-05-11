# OperaFix V62 - Registros de empresa y filtros

Cambios aplicados:

1. Registros de empresas ahora muestra de a 100 registros por página.
   - Se agregó paginación Anterior / Siguiente.
   - La selección masiva actúa sobre los registros visibles de la página actual.

2. Ventana de filtros mejorada.
   - El botón Aplicar filtro quedó arriba dentro de la ventana.
   - También se mantiene al final para comodidad.
   - Se agregó buscador de filtros para encontrar rápido campos como monto, fecha, AFP, RUT, etc.
   - Los filtros quedan agrupados por tipo/sección: Empresa y mandante, Gestión, Confirmaciones y CEN, Montos, Fechas, Datos bancarios, Facturación y Otros campos.

3. Los filtros actuales se cargan al abrir la ventana.
   - Si ya habías aplicado criterios, al volver a abrir la ventana se mantienen visibles.

Validación:
- Frontend compilado correctamente con `npm run build`.
- Backend no fue modificado en esta versión.
