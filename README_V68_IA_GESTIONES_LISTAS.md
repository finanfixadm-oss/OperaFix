# OperaFix V68 - IA de gestiones listas

Cambios principales:

1. IA de sugerencias corregida
   - Ya no sugiere cambios masivos de estado por monto.
   - Sugiere casos realmente listos para gestionar.
   - Criterios: monto > 0, Confirmación CC = Sí, Confirmación Poder = Sí, AFP/Entidad asignada, Estado pendiente y documentos/detalle cargados.

2. Consulta IA segura
   - `/api/ai-actions/execute` ahora muestra detalle y preview.
   - No ejecuta actualizaciones masivas desde lenguaje natural.
   - Para evitar riesgos, los cambios directos quedan bloqueados salvo acciones específicas por ID.

3. Filtros alineados a campos reales
   - `refund_amount`
   - `management_status`
   - `entity`
   - `mandante`
   - `confirmation_cc`
   - `confirmation_power`

4. Frontend AI Command Center
   - Muestra resultados en tabla, no solo JSON.
   - Guarda prompts en localStorage.
   - Muestra sugerencias IA con detalle de empresa, RUT, mandante, AFP, monto, CC, poder y documentos.
   - Cambia botón de ejecución por “Ver detalle”.

Validación:
- Backend: `npm run build` OK.
- Frontend: TypeScript `tsc -b` OK. Build Vite no se pudo completar en este entorno por dependencia opcional de Rollup faltante dentro del node_modules extraído; en Windows/Railway se resuelve con `npm install` y `npm run build`.

Comandos recomendados:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build

cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build

git add .
git commit -m "V68 IA gestiones listas"
git push
```
