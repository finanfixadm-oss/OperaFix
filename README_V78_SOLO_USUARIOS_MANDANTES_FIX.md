# OperaFix V78 - Usuarios internos con mandantes asignados

Este paquete respeta la versión base del proyecto y modifica únicamente permisos, usuarios y filtro por mandantes.

## Qué hace

- Al crear usuarios, Admin puede asignar uno o más mandantes.
- Interno y KAM pueden operar el CRM, pero solo sobre sus mandantes asignados.
- Interno/KAM no pueden crear usuarios.
- Admin ve todo y puede crear usuarios.
- Cliente ve portal/informes filtrados por sus mandantes asignados.
- Se crea automáticamente la tabla `operafix_user_mandantes` si no existe.
- El token de login ahora incluye:
  - `assigned_mandantes`
  - `assigned_mandante_ids`
  - `assigned_mandante_names`

## Archivos modificados

Backend:
- `src/routes/auth.ts`
- `src/middleware/security.ts`
- `src/routes/users.ts`
- `src/app.ts`
- `src/routes/records.ts`
- `src/routes/mandantes.ts`
- `src/routes/dashboard.ts`
- `src/routes/intelligence.ts`
- `src/routes/portal.ts`
- `src/routes/report-builder.ts`
- `src/routes/import-records.ts`
- `src/routes/companies.ts`
- `src/routes/company-groups.ts`
- `src/routes/management-lines.ts`
- `src/routes/management-line-afps.ts`
- `src/routes/managements.ts`

Frontend:
- `src/pages/UsersPage.tsx`
- `src/auth.ts`
- `src/App.tsx`
- `src/styles/zoho-modules.css`

## Validado

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

Nota: en este entorno `vite build` no corrió por permiso del binario local, pero TypeScript validó correctamente.

## Aplicar

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

## Importante

Después del deploy:
1. Cierra sesión.
2. Inicia sesión de nuevo.
3. El token nuevo cargará los mandantes asignados.

Solo el rol Admin puede crear/desactivar usuarios.
