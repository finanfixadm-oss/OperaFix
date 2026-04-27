# Fix 9 - Crear Registro de empresa

Este ZIP corrige el error mostrado en `crm.finanfix.cl/records` al guardar desde el modal **Crear Registro de empresa**.

## Qué se corrigió

1. `backend/src/routes/records.ts`
   - El `POST /api/records` ahora intenta crear usando la tabla nueva `managements`.
   - Si Railway todavía tiene la estructura antigua o incompleta, cae automáticamente a modo compatible y crea el registro en `lm_records` o `tp_records`.
   - El modo compatible detecta dinámicamente qué columnas existen en Railway antes de insertar, para evitar errores por columnas que todavía no estén migradas.
   - También intenta dejar una actividad de cronología, pero no bloquea la creación si la tabla `activities` no tiene todos los campos nuevos.

## Por qué fallaba

El formulario estaba guardando contra el modelo nuevo tipo Zoho (`managements`, `companies.razon_social`, relaciones con mandantes, grupos, líneas y AFP). En Railway probablemente la base aún tiene parte de la estructura antigua (`lm_records`, `tp_records`, `companies.business_name`, etc.).

Por eso la lectura podía funcionar con fallback, pero la creación fallaba antes de insertar.

## Cómo subirlo

1. Descomprimir este ZIP.
2. Reemplazar el proyecto local.
3. Desde GitHub Desktop revisar cambios.
4. Commit + Push.
5. Railway debería redeployar automáticamente.
6. Probar en `https://crm.finanfix.cl/records` creando un registro LM.

## Nota importante

Este fix desbloquea la creación sin romper lo que ya funciona. El siguiente paso correcto es ejecutar una migración ordenada para dejar Railway 100% alineado con el modelo nuevo Zoho (`managements`, detalle, edición, cronología, archivos, etc.).
