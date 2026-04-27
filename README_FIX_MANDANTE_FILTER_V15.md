# OperaFix v15 - Fix filtro por mandante

Corrección aplicada:

- El módulo Registros de empresas ahora filtra correctamente por cada botón de mandante.
- Antes el filtro dependía solo de `mandante.id`.
- Los registros creados en modo compatible/legacy a veces vienen con `mandante.name` pero sin `mandante.id`.
- Ahora el frontend compara por `mandante.id`, `mandante_id`, `mandante.name`, `mandante_name` o `mandante`.

Archivo principal modificado:

- `frontend/src/pages/RecordsPage.tsx`

Después de subir a GitHub/Railway, validar:

1. Abrir `/records`.
2. Click en `FINANFIX SOLUTIONS SpA`.
3. Deben aparecer solo registros de ese mandante.
4. Click en `Mundo Previsional`.
5. Deben aparecer solo registros de ese mandante.
6. Click en `Optimiza Consulting`.
7. Deben aparecer solo registros de ese mandante.
8. Click en `Todos los registros`.
9. Deben aparecer todos.
