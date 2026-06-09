# FIX V93 - Error 500 módulo KAM

Se corrigió el error 500 en los endpoints:

- `GET /api/kam/companies`
- `GET /api/kam/metrics`
- `GET /api/kam/rules`

## Causa probable

El módulo KAM intentaba preparar/consultar tablas nuevas sobre una base de datos existente. Si alguna tabla ya existía pero venía incompleta, o si la estructura real de `companies`/`mandantes` no coincidía exactamente, el backend podía responder `Internal Server Error` en HTML.

## Correcciones aplicadas

- Preparación más robusta de tablas KAM.
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` para columnas faltantes.
- Sincronización defensiva de empresas del mandante Finanfix Solutions SPA.
- Validación de existencia de tablas y columnas antes de consultar `companies` y `mandantes`.
- Respuestas JSON de error en el módulo KAM, en vez de HTML.
- Try/catch en `companies`, `metrics` y `rules`.

## Probar

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
npm run start
```

Luego abrir el módulo KAM y revisar que carguen Empresas, Seguimiento y Reglas.
