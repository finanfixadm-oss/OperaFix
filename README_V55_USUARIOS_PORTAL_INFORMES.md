# OperaFix v55 — Usuarios, portal por mandante e informes Excel

## Incluye

### 1) Control de usuarios
- Nuevo módulo `/usuarios`.
- Roles: `admin`, `interno`, `kam`, `cliente`.
- Usuario cliente asociado a un mandante.
- Primer login crea automáticamente un usuario admin si la tabla está vacía.

### 2) Portal cliente aislado por mandante
- Nuevo endpoint seguro: `GET /api/portal/records`.
- Si el usuario tiene rol `cliente`, el backend devuelve solo gestiones de su mandante.
- Si el usuario es interno/admin/kam, puede ver gestiones de todos los mandantes.

### 3) Módulo de informes Excel
- Nuevo módulo `/informes`.
- Selector de columnas disponibles.
- Filtros dinámicos por cualquier campo.
- Vista previa antes de descargar.
- Descarga real en `.xlsx`.
- Si el usuario es cliente, el informe queda limitado automáticamente a su mandante.

## Endpoints nuevos

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/portal/records`
- `GET /api/report-builder/fields`
- `POST /api/report-builder/preview`
- `POST /api/report-builder/download`

## Base de datos

Se agrega tabla `operafix_users`. El backend la crea automáticamente si no existe.
También se incluye script opcional:

`database/08_users_portal_reports.sql`

## Primer acceso

1. Entra a `/login`.
2. Si no existen usuarios, el primer correo/contraseña usado crea un usuario admin.
3. Luego entra a `/usuarios` y crea usuarios cliente asociados a cada mandante.

## Importante

- El aislamiento del portal e informes se aplica en backend, no solo en frontend.
- Para que el usuario cliente solo vea su mandante, debe iniciar sesión con rol `cliente` y tener `mandante_id` o `mandante_name` asociado.
