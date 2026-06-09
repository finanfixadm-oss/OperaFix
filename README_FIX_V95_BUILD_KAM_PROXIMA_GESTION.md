# FIX V95 - Build KAM Pipeline Comercial

Se corrigió el error TypeScript:

```text
src/routes/kam.ts:660:41 - error TS2339: Property 'proxima_gestion' does not exist on type 'KamCompany'.
```

## Causa

El campo `proxima_gestion` ya existía en la base de datos y en la lógica del módulo KAM, pero faltaba declararlo dentro del tipo TypeScript `KamCompany`.

## Corrección aplicada

Se agregaron al tipo `KamCompany` los campos comerciales usados por el pipeline:

- `fecha_asignacion`
- `fecha_ultimo_contacto`
- `proxima_gestion`
- `resultado_gestion`
- `motivo_perdida`
- `probabilidad_cierre`
- `canal_origen`

## Comando de prueba

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
```
