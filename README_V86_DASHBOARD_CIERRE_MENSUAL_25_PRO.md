# V86 - Dashboard cierre mensual día 25 + proyección vs materialización

Esta mejora modifica solo el Dashboard Ejecutivo y su backend.

## Lógica operacional agregada

Se consideran dos campos distintos:

- **Mes de ingreso solicitud**: mes en que se ingresó/proyectó la gestión.
- **Mes de producción 2026**: mes en que la gestión se materializó, es decir, cuando cambió a pagado/cerrado/facturado.

El dashboard agrega una sección nueva:

- Proyectado del mes.
- Materializado del mes.
- Gestiones que pasan al mes siguiente.
- Arrastre acumulado.
- Conversión del mes.
- Proyección por AFP.
- Materialización por AFP.

## Cierre mensual

El cierre operativo del mes termina el día 25.

- Si el día actual es 1 al 25, el mes operativo es el mes actual.
- Si el día actual es posterior al 25, el mes operativo pasa al mes siguiente.

## Archivos modificados

- `backend/src/routes/dashboard.ts`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/dashboard-executive-pro.css`

## Aplicación

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V86 dashboard cierre mensual 25"
git push
```

Después del deploy, abrir con `Ctrl + F5`.
