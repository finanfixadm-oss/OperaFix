# OperaFix V60 - Correcciones solicitadas

Cambios aplicados:

1. **Chat IA estilo ChatGPT**
   - El historial queda guardado en `localStorage`.
   - Al cambiar de pantalla y volver, la conversación no se pierde.
   - Se agregó panel lateral de conversaciones recientes.
   - Botón **Nuevo chat** para iniciar una conversación nueva.
   - Cada conversación toma como título el primer mensaje del usuario.

2. **Informes modificables e interactivos**
   - Las columnas del informe se seleccionan por casillas.
   - Las columnas seleccionadas se pueden mover arrastrando las casillas.
   - Se mantiene también el control con flechas arriba/abajo.
   - Los filtros del constructor de informes quedan contraídos por defecto.
   - El botón **Filtrar** despliega/oculta los filtros para que la pantalla no quede tan grande.

3. **Filtros de registros más compactos**
   - Se reemplazó el panel grande lateral por una tarjeta compacta.
   - El botón **Abrir filtros** muestra los filtros avanzados solo cuando se necesitan.

4. **Eliminación masiva**
   - Se habilitó selección múltiple de registros desde la tabla.
   - Se agregó botón **Eliminar seleccionados** cuando hay registros marcados.
   - Backend nuevo: `DELETE /api/records/bulk/delete`.
   - Límite de seguridad: máximo 500 registros por lote.

5. **Envío de correo**
   - Se conserva el flujo ya existente de preparación/envío de correo por gestión:
     - `GET /api/records/:id/email/compose`
     - `POST /api/records/:id/email/send`
   - El envío usa webhook/configuración existente y deja trazabilidad en la gestión.

Validación realizada:

- Frontend compilado con TypeScript y Vite.
- Backend compilado con TypeScript.

Comandos usados para validar:

```powershell
cd frontend
node node_modules/typescript/lib/tsc.js -b
node node_modules/vite/bin/vite.js build

cd ../backend
node node_modules/typescript/lib/tsc.js -p tsconfig.json
```

Para desplegar en Railway/Git:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix
git add .
git commit -m "V60 chat IA persistente informes interactivos filtros compactos eliminacion masiva"
git push
```
