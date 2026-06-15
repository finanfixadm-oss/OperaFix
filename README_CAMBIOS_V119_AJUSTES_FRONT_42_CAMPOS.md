# OperaFix V119 - Ajustes Front 42 Campos Oficiales

Cambios sobre V118:

1. Modal **Crear Registro de empresa**
   - Se agregan campos visibles:
     - Fecha término de contrato
     - Fecha Presentación AFP
     - Fecha ingreso AFP

2. Etiquetas de grupo
   - Se reemplaza **Buscar Grupo** por **Holding / Grupo empresa** en las vistas del frontend.

3. Desplegables alineados con estructura oficial de carga masiva
   - Estado contrato con cliente: Activo, Estudio inicial, Inactivo, Por vencer
   - Motivo (Tipo de exceso): Licencias Médicas (LM), Seguro de invalidez y sobrevivencia (SIS), Trabajo Pesado (TP)
   - Entidad: AFP CAPITAL, AFP CUPRUM, AFP HABITAT, AFP MODELO, AFP PLANVITAL, AFP PROVIDA, AFP UNO, Pendiente de asignación
   - Envío AFP: PRIMERO, SEGUNDO, TERCERO
   - Estado Gestión: Anulada, Gestionado, Pagado, Pendiente gestión, Rechazada AFP CAPITAL, Rechazada AFP MODELO, Rechazo bancario
   - Acceso portal / Porcentaje de liquidaciones: Si, No, No aplica
   - Consulta CEN / Contenido CEN / Respuesta CEN: Si, No
   - Facturado Finanfix: Facturado, Pagado, Pendiente
   - Facturado cliente: Facturado, Pendiente

Validación local realizada:
- Frontend: `npm run build` OK.

Nota:
- Backend mantiene los cambios de V118 para carga masiva y base de datos.
- No se incluye `.env`, `node_modules`, `.git` ni `dist` en el ZIP.
