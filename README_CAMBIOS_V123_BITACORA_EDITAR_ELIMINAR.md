# OperaFix V123 - Bitácora KAM editable

## Cambios incluidos

### Backend
- Se agregaron endpoints para modificar y eliminar líneas de bitácora KAM:
  - `PUT /api/kam/companies/:id/activities/:activityId`
  - `DELETE /api/kam/companies/:id/activities/:activityId`
- Se mantienen validaciones por rol:
  - KAM administrador / admin / interno pueden operar sobre cartera visible.
  - Usuario KAM solo puede modificar o eliminar gestiones de empresas asignadas a su cartera.
- Al modificar una gestión, también se actualiza el resumen comercial de la empresa cuando corresponde: estado, resultado, próxima gestión, probabilidad, observación y último contacto.

### Frontend
- En la tabla de bitácora se agregó columna `Acciones`.
- Cada línea de bitácora ahora tiene botones:
  - `Editar`
  - `Eliminar`
- Al editar, se abre el mismo modal de gestión con los datos precargados.
- El botón cambia a `Guardar cambios` cuando se está editando.
- Al eliminar, se pide confirmación antes de borrar.
