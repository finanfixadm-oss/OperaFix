# Cambios aplicados

1. Se corrigió `/api/records` para evitar que la pantalla quede bloqueada con el mensaje “No se pudieron cargar los registros de empresas”.
2. Si Railway aún no tiene creada o migrada la tabla nueva `managements`, el backend intenta cargar datos desde las tablas antiguas `lm_records` y `tp_records` para que la vista no se caiga.
3. Se agregaron scripts PowerShell:
   - `scripts/06-import-registros-xlsx-api.ps1`: carga un Excel real a través del API `/api/records`.
   - `scripts/07-check-railway-records.ps1`: prueba `/api/health` y `/api/records` en Railway.

## Cómo importar tu Excel real

```powershell
cd "RUTA_DEL_PROYECTO"
.\scripts\06-import-registros-xlsx-api.ps1 -ExcelPath "C:\ruta\tu_archivo.xlsx" -ApiBase "https://operafix-production.up.railway.app/api"
```

El importador usa la primera hoja del Excel si no indicas `-SheetName`.

## Cómo probar el error del pantallazo

```powershell
.\scripts\07-check-railway-records.ps1 -ApiBase "https://operafix-production.up.railway.app/api"
```

Si `/api/records` devuelve datos o `[]`, la pantalla ya no debería mostrar el error.
