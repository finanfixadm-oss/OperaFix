# OperaFix v18 - Adjuntos visibles y plantillas de correo

Cambios principales:

1. Los documentos adjuntos ahora se cargan en la ficha aunque el registro esté en modo compatible/legacy de Railway.
2. La pestaña Archivos adjuntos muestra los archivos asociados por related_record_id o management_id.
3. La sección Archivos / Respaldo reconoce categorías internas como CARTA_EXPLICATIVA, DETALLE_TRABAJADORES, COMPROBANTE_PAGO, RESPUESTA_CEN y ORDEN_COMPRA.
4. El modal Enviar correo electrónico ahora incluye selector de plantilla:
   - Comprobante ingreso gestión
   - Envío comprobante y detalle
   - Informe mensual de gestión
   - Correo libre
5. Al seleccionar plantilla, se autocompleta asunto y cuerpo con datos de la gestión: mandante, razón social, RUT, entidad, motivo, monto, N° solicitud y mes.
6. Se mantiene el checklist de archivos para seleccionar qué adjuntar al correo.

Archivos principales modificados:
- backend/src/routes/records.ts
- frontend/src/pages/RecordDetailPage.tsx
- frontend/src/styles/zoho-modules.css
