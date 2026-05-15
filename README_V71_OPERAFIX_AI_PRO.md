# OperaFix AI PRO V71

Esta entrega consolida mejoras para dejar OperaFix más cercano a un CRM operacional tipo ChatGPT + Zoho + Salesforce.

## Cambios principales

### IA conversacional
- `backend/src/routes/ai-chat.ts` usa interpretación OpenAI, filtros genéricos, fuzzy matching controlado, soporte de montos, booleanos y fechas.
- Consulta la data real legacy-compatible desde `lm_records` y `tp_records`.
- Devuelve `id` para que las filas del chat puedan abrir la ficha exacta.
- Soporta exportación contextual a CSV/Excel.

### Registros de empresas
- `/api/records` lee directamente desde `lm_records` y `tp_records`, evitando que `managements` vacío o desalineado oculte los registros.
- `RecordsPage.tsx` soporta abrir una ficha desde `?id=` o `?recordId=`.

### Dashboard ejecutivo
- `backend/src/routes/dashboard.ts` fue reescrito con SQL directo sobre `lm_records` y `tp_records`.
- Agrega métricas inteligentes:
  - monto total
  - pagado
  - pendiente
  - rechazado
  - Finanfix
  - casos listos para gestionar
  - bloqueos por poder
  - bloqueos por cuenta corriente
  - rankings por estado, AFP, mandante, tipo y aging
  - lista de prioridades
  - insights ejecutivos IA-ready

### Portal cliente PRO
- `backend/src/routes/portal.ts` fue reescrito con SQL directo y filtro por mandante del usuario cliente.
- Carga documentos relacionados cuando existan.
- `frontend/src/pages/ClientPortalPage.tsx` ahora tiene:
  - filtros por mandante, estado, AFP y búsqueda
  - KPIs ejecutivos
  - vista tarjetas
  - vista kanban
  - vista tabla
  - exportación CSV
  - acceso a ficha del registro

### Estilos
- `frontend/src/styles/zoho-modules.css` agrega estilos para Portal Cliente PRO.

## Comandos recomendados

Backend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npx prisma generate
npm run build
```

Frontend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```

Deploy:

```powershell
git add .
git commit -m "OperaFix AI PRO V71 dashboard portal IA"
git push
```

## Nota importante

No ejecutar `npx prisma db push` sin revisar antes el `schema.prisma`, porque puede proponer borrar tablas legacy como `operafix_users` o `operafix_audit_logs` si no están reflejadas en Prisma.

