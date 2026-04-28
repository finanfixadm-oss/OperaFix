# OperaFix v24 - Dashboard + Portal Cliente + IA mejorados

## Cambios principales

### Dashboard ejecutivo
- Filtros por mandante, estado y tipo LM/TP.
- Meta mensual editable, por defecto CLP 83.000.000.
- Barra de avance de meta.
- Exportación CSV de la vista filtrada.
- Ranking por mandante, AFP, estado y antigüedad operacional.
- Tabla de gestiones prioritarias.
- Últimas gestiones actualizadas.

### Portal cliente
- Filtros por mandante, estado y búsqueda libre.
- Resumen de gestiones visibles, monto devolución y documentos disponibles.
- Avance visual por etapa: Preparación, Ingreso, Respuesta, Pago/Cierre.
- Documentos con etiqueta de categoría.
- Exportación CSV de la vista cliente.

### IA para gestiones
- Alertas por prioridad Alta, Media y Baja.
- Detección de poder faltante, cuenta corriente faltante, carta faltante, archivo AFP faltante, pago sin comprobante, seguimiento +20 días, rechazo y bajo monto agrupable.
- Búsqueda por empresa, RUT, AFP, estado o alerta.
- Exportación CSV de alertas.
- Generación de plan semanal sugerido.
- Botón para copiar acción sugerida.

## Archivos modificados
- frontend/src/pages/DashboardExecutivePage.tsx
- frontend/src/pages/ClientPortalPage.tsx
- frontend/src/pages/AiGestionesPage.tsx
- frontend/src/styles/zoho-modules.css

## Deploy
```bash
git add .
git commit -m "v24 dashboard portal ia mejorados"
git push
```
