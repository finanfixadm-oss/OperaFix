# OperaFix V107 - Sin menú KAM duplicado

## Objetivo
Eliminar el segundo menú lateral interno que aparecía dentro del módulo KAM, porque la navegación ya existe en el sidebar principal de OperaFix.

## Cambios realizados
- Se eliminó el menú interno "Módulo KAM / Menú comercial" de `KamAssignmentPage.tsx`.
- La pantalla KAM ahora usa el ancho completo del área de contenido.
- Se mantiene la navegación por el sidebar principal izquierdo.
- Se mantienen las rutas por querystring:
  - `/kam-asignacion?tab=tracking`
  - `/kam-asignacion?tab=companies`
  - `/kam-asignacion?tab=kanban`
  - `/kam-asignacion?tab=agenda`
  - `/kam-asignacion?tab=campaigns`
  - `/kam-asignacion?tab=profiles`
  - `/kam-asignacion?tab=rules`
- Se mantienen las acciones:
  - Nueva empresa
  - Registrar gestión
  - Exportar filtrado

## Resultado esperado
El CRM queda más limpio: un solo menú lateral a la izquierda y el módulo KAM ocupa todo el espacio disponible.
