# OperaFix V72 - Inteligencia Operacional + Dashboard PRO + Portal Cliente PRO

## Archivos incluidos

### Backend
- `backend/src/routes/intelligence.ts`
  - Nuevo endpoint `/api/intelligence/summary`
  - Nuevo endpoint `/api/intelligence/priorities`
  - Score operacional 0-100 por caso
  - Priorización por monto, poder, CC, documentos, estado y antigüedad
  - Bloqueos por falta de poder, CC y casos dormidos
  - Ranking por mandante, AFP y estado

- `backend/src/routes/dashboard.ts`
  - Reemplazado por lectura SQL directa sobre `lm_records` y `tp_records`
  - Métricas reales legacy-compatible
  - KPIs de listo para gestionar, bloqueos, aging y rankings

- `backend/src/routes/portal.ts`
  - Reemplazado por SQL directo legacy-compatible
  - Filtra por mandante cuando el usuario tiene rol cliente
  - Adjunta documentos desde `documents`
  - Corrige error TypeScript `documents: never[]`

- `backend/src/app.ts`
  - Monta `/api/intelligence` protegido con roles `admin`, `interno`, `kam`

### Frontend
- `frontend/src/components/intelligence/IntelligenceSummaryPanel.tsx`
  - Nuevo panel IA ejecutivo
  - KPIs inteligentes
  - Insights del día
  - Top prioridades clickeables

- `frontend/src/pages/DashboardExecutivePage.tsx`
  - Integrado panel `IntelligenceSummaryPanel`

- `frontend/src/pages/ClientPortalPage.tsx`
  - Portal cliente PRO
  - KPIs, filtros, búsqueda, exportación
  - Vista tarjetas
  - Vista Kanban
  - Vista tabla
  - Semáforo por caso
  - Documentos visibles

- `frontend/src/styles/zoho-modules.css`
  - Estilos nuevos para IA ejecutiva y portal PRO

## Comandos

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npx prisma generate
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build

git add .
git commit -m "V72 intelligence dashboard portal pro"
git push
```

## Nota de validación

El frontend fue validado con `npm run build` correctamente.

El backend no pudo validarse completamente en este entorno porque Prisma requiere descargar binarios externos desde `binaries.prisma.sh` y el contenedor no tiene acceso estable a internet. En tu PC/Railway, ejecuta `npx prisma generate` antes de `npm run build`.
