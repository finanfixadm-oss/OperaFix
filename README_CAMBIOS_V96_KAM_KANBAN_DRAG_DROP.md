# OperaFix V96 - Kanban KAM con arrastrar y soltar

## Cambio implementado

Se actualizó el módulo KAM para que el modo Kanban permita mover tarjetas entre columnas usando drag & drop.

Al arrastrar una empresa a otra columna:

- Se actualiza automáticamente el campo `estado` de la empresa.
- Se registra una actividad en la bitácora comercial mediante el endpoint existente `PUT /api/kam/companies/:id`.
- El tablero se recarga para reflejar el cambio.
- Si se mueve a `Perdida` y no existe motivo de pérdida, el sistema solicita un motivo.
- Si la empresa está asignada y el nuevo estado queda activo, se asegura una próxima gestión para evitar que la empresa quede abandonada.

## Archivos modificados

- `frontend/src/pages/KamAssignmentPage.tsx`
- `frontend/src/styles.css`

## Notas

No se agregó una tabla nueva ni migración SQL. Se usa la estructura existente del módulo KAM V95.

## Prueba recomendada

1. Entrar al módulo KAM.
2. Abrir pestaña `Kanban`.
3. Arrastrar una tarjeta desde `Pendiente de contacto` a `Contactada`, `Interesada`, `Propuesta enviada`, `En negociación`, `Ganada` o `Perdida`.
4. Verificar que la tarjeta cambie de columna.
5. Abrir la empresa y revisar que el estado se haya actualizado.
6. Revisar que se haya agregado registro en la bitácora comercial.
