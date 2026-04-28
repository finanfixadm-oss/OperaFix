# OperaFix v28 - Drag & Drop para ordenar columnas

## Cambios incluidos

- El modal **Campos / columnas** ahora permite ordenar campos arrastrando los cuadros.
- Se eliminaron visualmente las flechas ← / → del flujo principal de ordenamiento.
- El orden se guarda por vista/mandante en **Registros de empresas**.
- El orden se guarda por mandante seleccionado en **Dashboard ejecutivo**.
- Se mantiene el selector de columnas visibles y el botón de vista estándar.
- No se agregaron dependencias externas: usa drag & drop nativo del navegador.

## Archivos modificados

- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/styles/zoho-modules.css`

## Uso

1. Entrar a Registros de empresas o Dashboard.
2. Abrir **Campos / columnas**.
3. Marcar los campos que quieres ver.
4. Arrastrar los cuadros para definir el orden.
5. Presionar **Aplicar**.

El orden queda guardado aunque recargues la página.
