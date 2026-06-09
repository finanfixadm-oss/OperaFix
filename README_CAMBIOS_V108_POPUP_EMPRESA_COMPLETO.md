# OperaFix V108 - Popup completo de empresa KAM

## Cambios aplicados

Se ajustó el popup de creación y edición de empresa KAM para que tenga los mismos campos solicitados para crear, modificar o eliminar empresas desde una sola ventana profesional.

## Campos incluidos en el popup

- RUT
- Razón Social
- Nro Empleados
- Monto Devolución
- Rubro
- Región
- Nombre contacto
- Cargo
- Correo
- Nro Telefónico contacto
- Nro Telefónico central / empresa
- LinkedIn empresa
- Campaña comercial
- Tipo oportunidad
- Estado
- Próxima gestión
- Probabilidad cierre %
- Resultado gestión
- Motivo pérdida
- Contactos adicionales
- Observación

## Contactos adicionales

El popup permite:

- Crear 1, 2, 3 o más contactos antes de guardar una empresa nueva.
- En empresas existentes, agregar contactos nuevos.
- Modificar contactos existentes.
- Eliminar contactos existentes.
- Marcar contacto principal.

## Eliminación

Cuando se abre una empresa existente, el popup muestra el botón **Eliminar empresa** para administradores/KAM administrador.

## Validaciones conservadas

- No permite crear duplicados por RUT o razón social.
- Si el estado es Perdida, exige motivo de pérdida.
- Si una empresa asignada sigue activa, exige próxima gestión.

## Archivos modificados

- frontend/src/pages/KamAssignmentPage.tsx
- frontend/src/pages/kam-visual-pro.css
