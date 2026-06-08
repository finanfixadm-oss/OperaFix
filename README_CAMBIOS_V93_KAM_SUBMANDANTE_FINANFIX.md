# OperaFix V93 - KAM como submandante de Finanfix Solutions SPA

## Lógica implementada

El módulo KAM ahora usa como fuente principal las empresas creadas en **Registro Empresas** bajo el mandante **Finanfix Solutions SPA**. Esas empresas se sincronizan automáticamente como empresas potenciales del módulo KAM.

La lógica queda así:

1. En Registro Empresas se cargan empresas bajo el mandante **Finanfix Solutions SPA**.
2. El módulo **KAM / Asignación KAM** las muestra como empresas potenciales.
3. El **KAM administrador** puede ver todas las empresas potenciales.
4. El **KAM administrador** puede asignar manualmente cada empresa a un **KAM vendedor**.
5. El **KAM vendedor** solo ve las empresas que tiene asignadas.
6. El KAM vendedor puede actualizar seguimiento comercial: estado, próxima gestión, probabilidad, resultado, motivo de pérdida y observaciones.
7. El módulo mide desempeño de los KAM en la pestaña **Seguimiento**.

## Cambios backend

Archivo principal:

- `backend/src/routes/kam.ts`

Cambios realizados:

- Sincronización automática desde tabla `companies` + `mandantes` cuando el mandante se llama o contiene `Finanfix Solutions SPA`.
- Nuevos campos técnicos en `operafix_kam_companies`:
  - `source_company_id`
  - `source_mandante_id`
  - `source_mandante_name`
  - `fecha_ultimo_contacto`
  - `proxima_gestion`
  - `resultado_gestion`
  - `motivo_perdida`
  - `probabilidad_cierre`
  - `canal_origen`
- Endpoint nuevo:
  - `GET /api/kam/users` para listar vendedores KAM activos.
  - `GET /api/kam/metrics` para medir seguimiento por KAM.
- Reglas de visibilidad:
  - `admin`, `interno` y `kam_admin`: ven todas las empresas potenciales.
  - `kam`: solo ve `kam_asignado_id = usuario actual`.
- Asignación manual:
  - `POST /api/kam/companies/:id/assign` permite asignar una empresa a un usuario con rol `kam` activo.

## Cambios frontend

Archivo principal:

- `frontend/src/pages/KamAssignmentPage.tsx`

Cambios realizados:

- Pantalla ahora se llama **Asignación y Seguimiento KAM**.
- Se muestra origen de la empresa: `Finanfix Solutions SPA`.
- Se agregó asignación manual a KAM vendedor desde el formulario lateral.
- Se agregó pestaña **Seguimiento** con métricas por KAM:
  - Asignadas
  - En gestión
  - Ganadas
  - Perdidas
  - Probabilidad promedio
  - Monto potencial
  - Monto ganado
  - Último contacto
- El KAM vendedor puede actualizar seguimiento de sus empresas asignadas.

## Importante

Para que las empresas aparezcan en el módulo KAM, deben estar creadas en Registro Empresas con el mandante **Finanfix Solutions SPA**. El sistema busca coincidencias por nombre de mandante, incluyendo:

- `Finanfix Solutions SPA`
- `Finanfix Solutions`
- `Finanfix`

## Comandos recomendados

Backend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
```

Frontend:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```
