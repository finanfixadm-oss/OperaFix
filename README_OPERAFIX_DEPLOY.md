# OperaFix actualizado

## Qué incluye
- Home apuntando a Registros de empresas
- Tabla tipo Zoho conectada a `/api/lm-records`
- Páginas secundarias limpias y compilables
- `api.ts` corrige `VITE_API_URL` con o sin `/api`
- Backend sirve `/storage`

## Antes de reemplazar
Haz respaldo de estas carpetas en tu repo local:
- backend/.env
- frontend/.env (si existe)
- cualquier archivo local no versionado

## Qué copiar al proyecto conectado a Git
- backend/
- frontend/
- database/
- .gitattributes
- .gitignore

## Qué NO sobreescribir a mano si ya lo tienes bien
- variables en Railway
- archivos `.env` locales, salvo que quieras revisar el ejemplo

## Railway
Backend:
- `DATABASE_URL` debe ser referencia al Postgres del mismo proyecto
- Pre-deploy: `npx prisma db push`
- Start: `npm run start`

Frontend:
- `VITE_API_URL=https://operafix-production.up.railway.app`

## Verificación rápida
- `https://operafix-production.up.railway.app/api/health`
- `https://operafix-production.up.railway.app/api/lm-records`
- `https://crm.finanfix.cl`
