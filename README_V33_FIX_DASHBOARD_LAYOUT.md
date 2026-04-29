# OperaFix v33 - Fix descuadre Dashboard

## Corrección principal
Se ajustó la cabecera del Dashboard ejecutivo para que los botones no se salgan hacia la derecha ni queden cortados.

## Cambios aplicados
- `.dashboard-hero-header` ahora usa grid responsive.
- Los botones se ordenan en varias líneas si falta espacio.
- Se evita overflow horizontal en `crm-content`, `dashboard-page` y cards.
- Se mantiene el header sticky pero con ancho controlado.

## Archivo modificado
- `frontend/src/styles/zoho-modules.css`
