# OperaFix v13 - Edición tipo Zoho

## Cambios incluidos

1. Botón **Editar** en la ficha del registro activa modo edición masiva.
2. En modo edición masiva, todos los campos editables de las secciones inferiores pasan a input/select/date/textarea.
3. Botones globales: **Guardar cambios** y **Cancelar**.
4. Se mantiene la edición individual por campo al hacer clic cuando no está activo el modo masivo.
5. Backend `PUT /api/records/:id` ahora responde JSON y soporta:
   - tabla nueva `managements`
   - modo compatible Railway con `lm_records` / `tp_records`
6. Se registra actividad de edición cuando la tabla `activities` lo permite.

## Archivos principales modificados

- `frontend/src/pages/RecordDetailPage.tsx`
- `frontend/src/styles/zoho-modules.css`
- `backend/src/routes/records.ts`

## Deploy

```powershell
git add .
git commit -m "feat: edicion tipo zoho en ficha de registros"
git push
```

Luego esperar el redeploy de Railway y recargar `crm.finanfix.cl/records`.
