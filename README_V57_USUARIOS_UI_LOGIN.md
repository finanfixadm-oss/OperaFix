# OperaFix v57 - UI usuarios + login corregido

## Cambios incluidos

- Login visual corregido para `crm.finanfix.cl/login`.
- Botón **Crear usuarios base** dentro del módulo `/usuarios`.
- Creación/actualización automática de los usuarios solicitados:
  - `mandante@mundoprevisional.cl` → cliente / Mundo Previsional
  - `mandante@optmizaco.cl` → cliente / Optimiza Consulting
  - `smendoza@finanfix.cl` → KAM
  - `gmendoza@finanfix.cl` → Admin
  - `lmendoza@finanfix.cl` → Admin
  - `egabriaguez@finanfix.cl` → Admin
- El admin puede definir la contraseña temporal al crear los usuarios base.
- Los clientes quedan asociados a su mandante para que el portal cliente e informes solo muestren sus gestiones.

## Cómo usar

1. Entra con un usuario admin.
2. Ve a **Usuarios**.
3. Presiona **Crear usuarios base**.
4. Ingresa una contraseña temporal, por ejemplo:

```txt
OperaFix2026!
```

5. Entrega esa contraseña al usuario para su primer acceso.

## Importante

El email `mandante@optmizaco.cl` se dejó exactamente como fue solicitado. Si corresponde corregir el dominio a `optimizaco.cl`, cámbialo desde el módulo de usuarios.
