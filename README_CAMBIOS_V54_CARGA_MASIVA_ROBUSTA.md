# OperaFix v54 — Carga masiva robusta

## Mejoras incluidas

1. **Detección automática de columnas**
   - Reconoce variaciones como `Razón Social`, `Empresa`, `RS`, `Entidad / AFP`, `AFP`, `Nro Solicitud`, `Ticket`, etc.
   - La vista previa muestra qué columnas fueron mapeadas y qué columnas no se usarán.

2. **Normalización automática de RUT**
   - Limpia puntos, espacios y caracteres extraños.
   - Deja el RUT como `12345678-9`.
   - Valida dígito verificador y marca advertencia si no coincide.

3. **Detección de duplicados antes de guardar**
   - Detecta duplicados dentro del mismo Excel.
   - Consulta `lm_records` y `tp_records` por RUT y N° Solicitud para marcar duplicados existentes.
   - Permite omitir duplicados al confirmar la carga.

4. **Carga en batch**
   - El commit procesa filas en lotes de 25 para mejorar velocidad.
   - El backend limita el batch entre 1 y 100 para evitar saturar Railway.

5. **Compatibilidad con Excel grande**
   - Se aumentó el límite del archivo a 50 MB.

## Importante

Si el build dice `Cannot find module 'xlsx'`, ejecuta en el backend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
```

El paquete `xlsx` ya viene declarado en `backend/package.json`, pero si tu `node_modules` local es antiguo debes reinstalar dependencias.
