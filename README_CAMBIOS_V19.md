# OperaFix v19 - Adjuntos y Plantillas de Correo

## Cambios incluidos

1. Documentos adjuntos visibles y compatibles con Railway/legacy
   - La carga de ficha vuelve a buscar documentos por `related_record_id` y por `management_id`.
   - Evita que los documentos desaparezcan cuando el registro viene desde tablas legacy.

2. Eliminación de documentos
   - Nuevo endpoint: `DELETE /api/records/documents/:documentId`.
   - Botón `Eliminar` en cada documento visible de la ficha.
   - Registra trazabilidad en cronología cuando se elimina un documento.

3. Plantillas de correo según guía enviada
   - Ingreso solicitud a entidad.
   - Ingreso por parte de entidad / N° solicitud.
   - Rechazo de gestión.
   - Envío comprobante y detalle de pago.
   - Informe semanal de gestiones LM.
   - Correo tipo.
   - Correo tipo colaboradores.

4. Envío de correo con trazabilidad
   - Se registra la plantilla utilizada.
   - Se mantiene checklist para seleccionar adjuntos.
   - El payload incluye `template_key` para el webhook.

## Archivos modificados

- `backend/src/routes/records.ts`
- `frontend/src/pages/RecordDetailPage.tsx`
- `frontend/src/styles/zoho-modules.css`

## Importante

Después de reemplazar esta versión:

```bash
git add .
git commit -m "v19 adjuntos y plantillas de correo"
git push
```

Railway debe hacer redeploy para que el backend tome el nuevo endpoint de eliminación.
