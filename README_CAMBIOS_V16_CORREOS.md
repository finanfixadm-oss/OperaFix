# OperaFix v16 - Envío de correo desde gestión

## Cambios incluidos

- Botón **Enviar correo electrónico** abre un modal tipo Zoho antes de enviar.
- El modal carga automáticamente:
  - Entidad/AFP de la gestión.
  - Correo destino si está configurado.
  - Asunto sugerido.
  - Cuerpo de correo sugerido.
  - Archivos cargados en la gestión.
- Los archivos se seleccionan con **checklist** antes del envío.
- Al enviar se registra trazabilidad en **Cronología** y en la pestaña **Correos**.
- El backend expone:
  - `GET /api/records/:id/email/compose`
  - `POST /api/records/:id/email/send`

## Configuración Railway recomendada

Para correos por entidad, agrega una variable:

```json
ENTITY_EMAILS_JSON={"AFP Modelo":"correo@afpmodelo.cl","Modelo":"correo@afpmodelo.cl","AFP Capital":"correo@afpcapital.cl"}
```

Para envío real usando un servicio externo o webhook:

```bash
EMAIL_WEBHOOK_URL=https://tu-webhook-de-envio
EMAIL_FROM=notificaciones@finanfix.cl
PUBLIC_BASE_URL=https://operafix-production.up.railway.app
```

Si `EMAIL_WEBHOOK_URL` no está configurado, el sistema registra la trazabilidad, pero marca el envío como `PENDIENTE_CONFIGURACION`.
