# OperaFix CRM - Base Zoho UI completa

Esta versión deja el proyecto con una base visual y funcional tipo Zoho para todos los módulos principales:

- Inicio
- Informes
- Análisis
- Mis solicitudes
- Empresas
- Colaboradores
- Documentos
- Grupos de empresas - LM
- Registros de empresas
- Grupos empresas - TP
- Gestiones - TP
- Detalle tipo Zoho para LM

## Importante

- Mantiene el backend y la base actual ya operativa en Railway.
- No incluye `node_modules`, `dist` ni `.env`.
- El frontend compila a nivel TypeScript.
- Para build completo en Windows/Railway, ejecutar `npm install` en `frontend` y `backend`.

## Pasos

### Backend

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
```

### Frontend

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```

## Notas

Esta entrega prioriza:

1. Estructura visual tipo Zoho en todas las vistas.
2. Filtros por módulo con buscador pequeño.
3. Tabla central y acciones arriba.
4. Vista detalle LM tipo Zoho.
5. Integración con endpoints ya existentes.

La siguiente etapa recomendada es la migración completa de la jerarquía Mandante -> Grupo -> Empresa -> Línea -> AFP -> Gestión.
