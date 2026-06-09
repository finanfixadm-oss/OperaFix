# V102 - Fix eliminación de empresas KAM sincronizadas desde Finanfix

## Problema corregido
Algunas empresas creadas en el perfil/mandante **Finanfix Solutions SPA** se podían eliminar desde el módulo KAM, pero volvían a aparecer porque el endpoint sincronizaba nuevamente las empresas desde `Registro Empresas`.

## Corrección aplicada
- Al eliminar una empresa KAM, se registra una eliminación lógica en `operafix_kam_deleted_companies`.
- Si la empresa venía desde `Registro Empresas` y pertenece a **Finanfix Solutions SPA**, el backend intenta eliminar también el registro origen en `companies`.
- Si la eliminación del origen no es posible por restricciones de base de datos, la empresa queda bloqueada por `source_company_id`, RUT normalizado y razón social normalizada.
- La sincronización de empresas Finanfix ahora excluye registros eliminados, por lo que no vuelven a aparecer.
- Se mantiene la limpieza de contactos, bitácora e historial KAM.

## Casos que corrige
- Registros de prueba o mal cargados como `1-9 / MM`.
- Registros de prueba como `3 / 4`.
- Empresas potenciales sincronizadas desde Finanfix que reaparecían después de eliminarse.

## Validación esperada
1. Entrar como KAM administrador.
2. Ir a módulo KAM.
3. Eliminar la empresa.
4. Refrescar la página.
5. La empresa no debe volver a aparecer.
