# OperaFix v14 - Fix edición de Mandante

Esta versión corrige el error 500 al modificar el campo Mandante desde la ficha tipo Zoho.

## Cambios principales

- `backend/src/routes/records.ts`
  - Si cambia `mandante_id`, `mandante_name` o `mandante`, ahora reconstruye el contexto completo:
    - `mandante_id`
    - `group_id`
    - `company_id`
    - `line_id`
    - `line_afp_id`
  - Se corrigió la actualización legacy para no enviar `null` a columnas que no venían en el formulario.
  - Evita error PostgreSQL `23502 NOT NULL violation` al editar solo un campo.

## Deploy

```bash
git add .
git commit -m "fix v14 editar mandante"
git push
```

Luego esperar el redeploy de Railway.
