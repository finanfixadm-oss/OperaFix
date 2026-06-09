# OperaFix V98 - FIX Kanban próxima gestión

## Problema corregido
Al arrastrar una tarjeta del Kanban a otro estado activo, el backend podía responder:

> Debes ingresar próxima gestión para mantener la empresa activa y evitar que quede abandonada.

Esto ocurría cuando la empresa asignada no tenía `proxima_gestion` y el cambio de estado llegaba desde el Kanban sin una fecha válida.

## Solución
Se ajustó el backend en `src/routes/kam.ts` para que, cuando una empresa asignada quede en un estado activo y no tenga próxima gestión, el sistema asigne automáticamente la fecha del día siguiente.

## Resultado
- El arrastre Kanban ya no se bloquea por falta de próxima gestión.
- La empresa no queda abandonada, porque se agenda automáticamente para mañana.
- Se mantiene la validación obligatoria de motivo cuando el estado es `Perdida`.
