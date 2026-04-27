# OperaFix v23 - Dashboard + Portal Cliente + IA para gestiones

## Incluye

### 1. Dashboard ejecutivo
Ruta: `/dashboard`

- KPIs de devolución, monto cliente, monto Finanfix, pendientes, pagadas/cerradas y rechazadas.
- Ranking por mandante.
- Ranking por AFP/entidad.
- Ranking por estado de gestión.
- Tabla de últimas gestiones actualizadas con acceso directo a la ficha.

### 2. Portal cliente
Ruta: `/portal-cliente`

- Vista consultiva filtrable por mandante.
- Búsqueda por RUT, razón social, AFP, estado o N° solicitud.
- Tarjetas de gestiones con estado, monto, tipo, N° solicitud y documentos disponibles.
- Enlaces a documentos cargados en cada gestión.

### 3. IA para gestiones
Ruta: `/ia-gestiones`

Motor de reglas de negocio que detecta:

- Gestiones de alto monto abiertas.
- Falta de confirmación de poder.
- Falta de confirmación de cuenta corriente.
- Falta de carta explicativa.
- Gestiones pagadas sin comprobante/detalle visible.
- Seguimientos con más de 20 días desde presentación o actualización.
- Rechazos sin motivo o pendientes de reproceso.

Cada alerta muestra prioridad, motivo y acción sugerida, con botón para abrir la gestión.

## Archivos modificados

- `frontend/src/App.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/styles/zoho-modules.css`

## Archivos nuevos

- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/ClientPortalPage.tsx`
- `frontend/src/pages/AiGestionesPage.tsx`

## Deploy

```powershell
git add .
git commit -m "v23 dashboard portal cliente ia gestiones"
git push
```

Luego esperar el redeploy de Railway.
