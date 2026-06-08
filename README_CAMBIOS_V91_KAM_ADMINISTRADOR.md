# V91 - Módulo KAM administrador

## Qué se agregó

Se agrega el nuevo rol `kam_admin` / **KAM administrador** para separar la operación comercial en dos niveles:

1. **Administrador**
   - Ve todo el CRM.
   - Puede crear, editar, activar, desactivar y eliminar cualquier usuario.
   - Puede crear usuarios Admin, Interno, KAM administrador, KAM vendedor y Cliente.

2. **KAM administrador**
   - Opera el CRM igual que un KAM interno, pero limitado a sus mandantes asignados.
   - Tiene acceso al módulo **Usuarios**.
   - Solo puede crear, editar, activar, desactivar o eliminar usuarios con rol **KAM vendedor**.
   - Solo puede asignar a sus KAM vendedores mandantes que ya pertenezcan a su propia cartera.
   - No puede crear administradores, internos, clientes ni otros KAM administradores.

3. **KAM vendedor**
   - Opera el CRM solo con los mandantes/casos que le asignó el Administrador o el KAM administrador.
   - No puede administrar usuarios.

## Lógica comercial implementada

La lógica queda así:

- El **Administrador** crea un usuario con rol **KAM administrador** y le asigna una cartera de mandantes.
- El **KAM administrador** entra al módulo **Usuarios**.
- Desde ahí crea usuarios **KAM vendedor**.
- A cada KAM vendedor le asigna uno o más mandantes/casos de su cartera.
- El KAM vendedor solo verá dashboard, registros, informes, portal y carga masiva de esos mandantes asignados.

## Archivos principales modificados

### Backend

- `backend/src/routes/auth.ts`
  - Se agrega el rol `kam_admin` como rol válido.

- `backend/src/middleware/security.ts`
  - Se agrega `kam_admin` al control de permisos.
  - Se agrega `isKamAdmin()`.
  - Se incluye `kam_admin` dentro de los roles operativos con alcance por mandante.

- `backend/src/app.ts`
  - Se habilita `kam_admin` para módulos operativos.
  - Se habilita `/api/users` para `admin` y `kam_admin`.

- `backend/src/routes/users.ts`
  - Se reemplaza la lógica exclusiva de admin por `admin` o `kam_admin`.
  - Si el usuario conectado es KAM administrador:
    - Solo puede gestionar usuarios KAM vendedor.
    - Solo puede asignar mandantes dentro de su propia cartera.
    - Solo ve usuarios KAM vendedor que tengan intersección con su cartera.

### Frontend

- `frontend/src/auth.ts`
  - Se agrega `kam_admin` a los roles válidos.
  - Se agrega etiqueta visual **KAM administrador**.
  - Se habilita el módulo Usuarios para `admin` y `kam_admin`.

- `frontend/src/App.tsx`
  - Se agrega `kam_admin` en rutas protegidas.
  - La pantalla `/usuarios` queda disponible para `admin` y `kam_admin`.

- `frontend/src/pages/UsersPage.tsx`
  - Se agrega opción **KAM administrador** al selector de rol.
  - Cuando entra un KAM administrador, el formulario queda bloqueado para crear solo **KAM vendedor**.
  - Los mensajes de ayuda explican la nueva lógica de reparto de cartera.

## Importante para desplegar

Después de reemplazar los archivos, ejecutar:

```bash
cd backend
npm install
npm run build

cd ../frontend
npm install
npm run build
```

No requiere migración de base de datos porque el campo `role` es tipo texto.
