# OperaFix v26 - Scroll horizontal y orden de columnas

## Cambios incluidos

### Registros de empresas
- Se agregó barra de desplazamiento horizontal cuando se muestran muchas columnas.
- La tabla ya no comprime todas las columnas; mantiene ancho mínimo por campo.
- El primer checkbox queda fijo al mover la tabla hacia el lado.
- El selector de campos ahora permite cambiar el orden de visualización con botones ← / →.
- La configuración de columnas se guarda en `localStorage`, por lo que se mantiene al recargar.

### Dashboard ejecutivo
- El detalle dinámico mantiene el orden elegido por el usuario.
- El selector de campos también permite mover columnas con ← / →.
- La exportación CSV respeta columnas visibles y orden seleccionado.

## Archivos modificados
- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/styles/zoho-modules.css`
- `frontend/src/styles.css`

## Uso
1. Ir a Registros de empresas o Dashboard ejecutivo.
2. Click en `Campos / columnas`.
3. Marcar los campos que se quieren mostrar.
4. Usar ← / → para ordenar las columnas.
5. Click en `Aplicar`.

