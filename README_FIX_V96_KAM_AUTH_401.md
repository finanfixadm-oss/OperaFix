# Fix V96 KAM Auth 401

Corrección aplicada al módulo KAM cuando el frontend quedaba con un token anterior o inválido después de actualizar el ZIP.

## Problema
En el navegador aparecía:

- `/api/kam/companies` 401
- `/api/kam/profiles` 401
- `/api/kam/rules` 401
- `/api/kam/metrics` 401
- `Debes iniciar sesión.`

## Correcciones

- El módulo KAM ahora usa `req.user` cuando ya fue autenticado por el middleware general.
- El frontend captura correctamente errores 401 y redirige al login sin dejar promesas sin manejar.
- Los endpoints de perfiles y reglas no se consultan innecesariamente cuando el rol no corresponde.
- Se corrigió una duplicación defensiva en la creación SQL de `operafix_kam_profiles`.

## Qué hacer después de instalar

1. Reemplazar el proyecto por este ZIP.
2. Ejecutar build backend y frontend.
3. Cerrar sesión en el navegador e iniciar nuevamente.
4. Si el navegador conserva un token antiguo, limpiar Local Storage o usar el botón salir.

