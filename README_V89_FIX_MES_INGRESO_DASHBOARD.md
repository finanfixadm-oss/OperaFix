# V89 - Fix Mes de ingreso solicitud en Dashboard

## Problema corregido

El Dashboard calculaba la proyección mensual con el campo `Mes de ingreso solicitud`, pero el endpoint `/api/records` no estaba devolviendo ese campo en la respuesta normalizada de registros.

Por eso un caso que sí tenía:

- `Mes de ingreso solicitud = Junio`
- `Mes de producción 2026 = Junio`

no aparecía en la sección de **Proyección vs materialización**.

## Corrección aplicada

En `backend/src/routes/records.ts`, dentro de `legacyRowToRecord`, se agregó:

```ts
mes_ingreso_solicitud: row.request_entry_month || row.mes_ingreso_solicitud || null,
```

Ahora el Dashboard puede leer correctamente:

- `Mes de ingreso solicitud` para proyectado.
- `Mes de producción 2026` para materializado.

## Importante

Un caso rechazado puede aparecer como proyectado del mes si tiene `Mes de ingreso solicitud = Junio`, pero no debe contar como materializado si su estado no es pagado/cerrado/facturado.

## Aplicación

Reemplazar:

```txt
backend/src/routes/records.ts
```

Luego ejecutar:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V89 fix mes ingreso solicitud dashboard"
git push
```

Después del deploy, abrir el CRM con `Ctrl + F5`.
