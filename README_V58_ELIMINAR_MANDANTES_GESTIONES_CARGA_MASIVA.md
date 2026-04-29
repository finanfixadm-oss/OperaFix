# OperaFix v58

Cambios incluidos:

- Eliminar mandantes desde el módulo Mandantes.
- Eliminación forzada con confirmación: limpia gestiones, líneas, empresas, grupos y desasocia usuarios cliente del mandante eliminado.
- Eliminar registros/gestiones desde Registros de empresas.
- Endpoint `DELETE /api/records/:id` compatible con `managements`, `lm_records` y `tp_records`.
- Carga masiva mejorada: ahora crea/usa el mandante del Excel y lo asocia también en `managements` con inserción dinámica compatible Railway.
- Se mantiene respaldo legacy en `lm_records` / `tp_records`.

## Importante

Si eliminas un mandante con información asociada, se eliminarán sus gestiones asociadas. Usar solo después de confirmar.
