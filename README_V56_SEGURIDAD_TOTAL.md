# OperaFix v56 — Seguridad total, permisos y auditoría

## Cambios principales

### Frontend
- Corrige `src/api.ts` para que `fetch` compile sin errores TypeScript en los `headers`.
- Agrega `src/auth.ts` con roles y permisos por módulo.
- Agrega `src/components/ProtectedRoute.tsx`.
- Menú superior/lateral ahora se adapta al rol del usuario.
- Usuario `cliente` entra directo al portal cliente y no ve módulos internos.

### Backend
- Agrega `src/middleware/security.ts`.
- Protege rutas por rol en `src/app.ts`.
- Agrega `src/routes/audit.ts`.
- Auditoría básica en descargas/vistas previas de informes.

## Roles

| Rol | Acceso |
| --- | --- |
| admin | Todo |
| interno | Todo operativo + usuarios |
| kam | Dashboard, registros, IA, portal, informes |
| cliente | Solo portal cliente e informes filtrados por su mandante |

## Seguridad multi-mandante

Los usuarios `cliente` deben tener `mandante_id` o `mandante_name` asignado. El backend filtra sus datos por mandante; no depende solo del frontend.

## Build

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```

## Variables requeridas

```env
JWT_SECRET=una_clave_larga_segura
OPENAI_API_KEY=sk-...
```
