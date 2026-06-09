# OperaFix V99 - Contactos múltiples KAM, LinkedIn, eliminación y duplicados

## Cambios incluidos

- Se agrega tabla `operafix_kam_company_contacts` para manejar múltiples contactos por empresa.
- Cada contacto puede tener:
  - Nombre
  - Cargo
  - Correo
  - Nro telefónico del contacto
  - LinkedIn
  - Observación
  - Marca de contacto principal
- Se agregan nuevos campos en empresa KAM:
  - `telefono_central`
  - `linkedin_url`
- Se agrega sección visual de **Contactos y LinkedIn** dentro de la ficha KAM.
- Se puede marcar un contacto como principal; al hacerlo actualiza la ficha principal de la empresa.
- Se agrega eliminación de contactos.
- Se agrega eliminación de empresas desde el módulo KAM para admin/KAM administrador.
- Al eliminar empresa se eliminan también contactos, bitácora e historial KAM asociado.
- Se agrega mensaje visual de guardado, actualización, asignación, eliminación y registro de gestión.
- Se bloquea la creación/edición de empresas duplicadas por:
  - RUT normalizado
  - Razón social
- El KAM vendedor sigue viendo solo las empresas asignadas.
- El KAM administrador sigue viendo todas las empresas Finanfix.

## SQL opcional

`database/12_kam_contacts_linkedin.sql`

No es obligatorio ejecutarlo manualmente, porque el backend prepara las columnas/tablas al iniciar el módulo KAM. Se deja por respaldo para preparar la base antes del despliegue si lo prefieres.
