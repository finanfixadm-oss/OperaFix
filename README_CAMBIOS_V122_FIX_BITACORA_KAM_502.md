# OperaFix V122 - Fix bitácora KAM 502 / Failed to fetch

## Problema corregido

Al registrar una acción en la bitácora KAM desde perfiles `kam_admin` o `kam`, el frontend mostraba:

- `No se pudo completar la acción`
- `Failed to fetch`
- `POST /api/kam/companies/:id/activities 502 Bad Gateway`
- Mensaje CORS en navegador por ausencia de cabeceras cuando el backend fallaba.

## Causa probable

El endpoint `POST /api/kam/companies/:id/activities` no tenía manejo defensivo de errores. Si PostgreSQL rechazaba el insert/update por fecha inválida, estructura incompleta de tabla o diferencia de esquema, Express podía dejar la petición sin respuesta correcta y Railway devolvía 502.

## Cambios

- Se envolvió `POST /api/kam/companies/:id/activities` en `try/catch`.
- Se normaliza `proxima_gestion` en backend antes de insertar.
- Se castea `proxima_gestion` como `date` de forma explícita en el insert.
- Se devuelve JSON de error controlado en vez de romper la petición.
- Se agregó manejo de error también al `GET /api/kam/companies/:id/activities`.
- Se agregó SQL de reparación:

```txt
database/17_fix_kam_activities_bitacora_502.sql
```

## SQL recomendado en Railway

Ejecutar el archivo:

```powershell
psql "$env:DATABASE_URL" -f .\database\17_fix_kam_activities_bitacora_502.sql
```

O copiar y pegar el contenido del archivo en Railway PostgreSQL.
