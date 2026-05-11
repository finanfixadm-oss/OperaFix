# OperaFix V59 - Bloque PRO

Cambios aplicados sobre el proyecto base sin mover la estructura funcional existente.

## Registros de empresas
- El botón **Filtrar** ahora despliega/oculta el panel de filtros para que la vista no quede cargada permanentemente.
- Se agregó selección masiva de registros desde la tabla.
- Se agregó botón **Eliminar seleccionados (N)** cuando hay registros marcados.
- La eliminación masiva usa el endpoint existente `DELETE /records/:id` por cada registro para conservar la limpieza de trazabilidad/documentos.

## Informes
- Las columnas del informe ahora se pueden reordenar arrastrando las casillas marcadas.
- Se mantienen los botones ↑ / ↓ como respaldo.

## IA para gestiones
- El historial del chat queda guardado en `localStorage`.
- Al cambiar de pantalla y volver a IA, el historial se mantiene.
- El botón **Limpiar chat** borra tanto el historial visible como el guardado localmente.

## Correo
- Se conserva el flujo existente de **Enviar correo electrónico** desde la ficha del registro.
- No se movió la lógica existente de plantillas/documentos/trazabilidad.

## Validación
- Frontend compilado correctamente con:

```powershell
cd frontend
npm run build
```

