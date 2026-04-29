# OperaFix v44 - IA operativa real segura

## Importante
Esta versión NO contiene claves OpenAI en el código. La IA usa exclusivamente la variable de entorno del backend:

```env
OPENAI_API_KEY=tu_api_key_configurada_en_railway
OPENAI_MODEL=gpt-4o-mini
```

Después de actualizar la variable en Railway, debes hacer **Redeploy**.

## Qué cambia

### IA Chat CRM
- Usa OpenAI cuando `OPENAI_API_KEY` existe en Railway.
- Si OpenAI falla, responde con análisis local para no romper el módulo.
- Lee registros reales desde `managements` o fallback legacy `lm_records` / `tp_records`.
- Evita columnas inexistentes mediante introspección de `information_schema`.

### Informes por lenguaje natural
Puedes pedir:
- `Crea un informe con columnas RUT, Razón Social, Entidad, Estado Gestión y Monto Devolución`.
- `Dame informe de Optimiza Consulting solo AFP Modelo`.
- `Lista casos sin poder y sin confirmación CC`.

### Acciones operativas con confirmación
La IA puede proponer y ejecutar, solo si confirmas:
- Cambiar estado de gestión.
- Agregar nota/comentario.
- Crear tarea de seguimiento.
- Marcar confirmación CC / Poder.
- Crear borrador de correo.

Ejemplos:
- `Cambia las gestiones de AFP Modelo a Pendiente Gestión`.
- `Marca los casos de Coca Cola como Pagado`.
- `Agrega nota: se solicitó respuesta a la entidad`.
- `Crea tarea de seguimiento para los casos sin poder`.
- `Prepara correo para gestiones de alto monto`.

## Seguridad
- No subas `.env` con secretos al repositorio.
- Railway debe tener `OPENAI_API_KEY` como variable.
- Si alguna key fue compartida en pantalla o chat, revócala y crea otra.
