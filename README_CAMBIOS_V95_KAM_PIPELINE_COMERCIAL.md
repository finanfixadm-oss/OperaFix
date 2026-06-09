# OperaFix V95 - Pipeline comercial KAM

Esta versión extiende el módulo KAM sobre la base de V94.

## Nuevas funciones

- Bitácora comercial por empresa.
- Registro de gestiones por tipo:
  - Llamada
  - Correo
  - WhatsApp
  - Reunión
  - Propuesta
  - Seguimiento
  - Reasignación
- Registro de resultado, próxima acción, próxima gestión, estado de venta y probabilidad.
- Historial visible dentro de la ficha de cada empresa.
- Validación obligatoria de motivo/observación cuando una empresa pasa a `Perdida`.
- Validación de próxima gestión para empresas activas asignadas, evitando que queden abandonadas.
- Nueva pestaña `Kanban` para ver el pipeline comercial por estado.
- Alertas visuales para próximas gestiones vencidas.
- Nuevos endpoints backend:
  - `GET /api/kam/companies/:id/activities`
  - `POST /api/kam/companies/:id/activities`
- Nueva tabla:
  - `operafix_kam_activities`

## Lógica comercial mantenida

- Finanfix Solutions SPA sigue funcionando como mandante principal interno.
- El KAM administrador ve todas las empresas potenciales.
- El KAM vendedor solo ve empresas asignadas.
- La asignación manual y la recomendación inteligente se mantienen.
- El dashboard KAM y los filtros de V94 se mantienen.

## Comandos sugeridos

Backend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
```

Frontend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```

## Nota

El archivo `database/11_kam_activities_pipeline.sql` es opcional. El backend crea la tabla automáticamente al iniciar el módulo KAM, pero el SQL queda disponible por si quieres preparar la base manualmente.
