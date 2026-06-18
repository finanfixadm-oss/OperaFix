# OperaFix V128 - Fix desasignar empresa KAM

## Problema corregido
Cuando el KAM administrador quitaba la asignación de una empresa, la empresa seguía mostrando el KAM anterior en el módulo comercial.

## Cambios backend
Archivo modificado:

- `backend/src/routes/kam.ts`

Se actualizó el endpoint:

- `POST /api/kam/companies/:id/assign`

Ahora permite:

- asignar una empresa a un KAM vendedor activo;
- desasignar una empresa enviando `kam_asignado_id: null` o vacío;
- limpiar `kam_asignado_id`;
- limpiar `fecha_asignacion`;
- dejar el estado como `Sin asignar`;
- registrar historial de desasignación en `operafix_kam_assignment_history`.

## Cambios frontend
Archivo modificado:

- `frontend/src/pages/KamAssignmentPage.tsx`

Ahora el selector de KAM permite elegir:

- `Sin asignar / quitar asignación`

Cuando una empresa ya tiene KAM y se selecciona esa opción, el botón ejecuta la desasignación y refresca la tabla.

## SQL
No requiere migración nueva.
