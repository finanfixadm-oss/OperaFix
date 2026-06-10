# OperaFix V116 - FIX actualización empresa KAM 500

## Problema corregido

Al editar una empresa y guardar cambios, el endpoint:

`PUT /api/kam/companies/:id`

podía responder 500 y mostrar:

`No se pudo actualizar la empresa KAM.`

El caso más probable era el formato de fecha en **Próxima gestión**, por ejemplo `10-06-2026`, que PostgreSQL podía rechazar dependiendo del formato esperado.

## Cambios incluidos

- Backend ahora acepta fechas:
  - `yyyy-mm-dd`
  - `dd-mm-aaaa`
  - `dd/mm/aaaa`
- Backend normaliza `proxima_gestion` antes de guardar.
- Query de actualización KAM ahora usa casts explícitos para evitar errores de tipo.
- El detalle del error backend se devuelve en JSON para diagnosticar mejor.
- Frontend normaliza la fecha antes de enviar al backend.
- Mantiene los popups profesionales de éxito y error.
- Al guardar empresa, asignar KAM o registrar gestión, el usuario recibe confirmación clara.

## Archivos modificados

- backend/src/routes/kam.ts
- frontend/src/pages/KamAssignmentPage.tsx
