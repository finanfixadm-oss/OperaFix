# FIX V97 - KAM Kanban CORS / Drag & Drop

## Problema corregido
Al mover una tarjeta en el tablero Kanban desde `https://crm.finanfix.cl`, el navegador bloqueaba la llamada `PUT /api/kam/companies/:id` por CORS:

```text
No 'Access-Control-Allow-Origin' header is present on the requested resource.
Failed to fetch
```

## Correcciones aplicadas

- Se agregó manejo CORS defensivo antes de las rutas protegidas.
- Se habilitó respuesta `OPTIONS` para preflight de `PUT`, `PATCH`, `DELETE`, `POST` y `GET`.
- Se autorizó explícitamente el origen `https://crm.finanfix.cl`.
- Se mantuvo soporte para `http://localhost:5173`, `http://localhost:3000` y Railway.
- Se reforzó el endpoint `PUT /api/kam/companies/:id` con `try/catch`, para que devuelva JSON controlado si ocurre un error y no deje al navegador sin cabeceras CORS.

## Archivos modificados

- `backend/src/app.ts`
- `backend/src/routes/kam.ts`

## Prueba recomendada

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
```

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```

Luego desplegar backend y frontend nuevamente.
