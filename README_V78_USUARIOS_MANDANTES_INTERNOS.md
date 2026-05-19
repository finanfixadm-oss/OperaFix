# OperaFix V78 - Usuarios internos con mandantes asignados

Esta entrega modifica solo seguridad, usuarios y filtrado por mandante.

## Qué agrega

- Al crear usuarios puedes asignar uno o más mandantes a roles:
  - Interno
  - KAM
  - Cliente
- Los usuarios internos/KAM asignados pueden operar el CRM, pero solo ven información de sus mandantes.
- Los usuarios internos/KAM no pueden crear ni administrar usuarios.
- Solo Admin puede entrar a Control de usuarios.
- El token JWT ahora incluye:
  - assigned_mandante_ids
  - assigned_mandante_names
- Se filtran por mandante:
  - Registros de empresas
  - Portal cliente
  - Dashboard backend
  - Intelligence backend
  - Lista de mandantes

## Regla de acceso

- Admin: ve todo y administra usuarios.
- Interno/KAM con mandantes asignados: ve y opera solo esos mandantes.
- Interno/KAM sin mandantes asignados: mantiene compatibilidad y ve todo.
- Cliente: ve solo sus mandantes asignados o su mandante principal.

## Archivos modificados

Backend:
- backend/src/middleware/security.ts
- backend/src/routes/auth.ts
- backend/src/routes/users.ts
- backend/src/routes/records.ts
- backend/src/routes/mandantes.ts
- backend/src/routes/portal.ts
- backend/src/routes/dashboard.ts
- backend/src/routes/intelligence.ts

Frontend:
- frontend/src/pages/UsersPage.tsx
- frontend/src/auth.ts
- frontend/src/App.tsx
- frontend/src/components/Layout.tsx
- frontend/src/styles/zoho-modules.css

## Validación realizada

Backend:
```powershell
cd backend
npm run build
```

Frontend TypeScript:
```powershell
cd frontend
npx tsc -b
```

## Deploy

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V78 usuarios internos con mandantes asignados"
git push
```

Después de desplegar, cierra sesión e inicia sesión nuevamente para que el token nuevo incluya los mandantes asignados.
