# OperaFix V126 - Topbar usuario profesional

## Objetivo
Mejorar la barra superior del CRM para que el área derecha de usuario sea más profesional, consistente con la marca Finanfix y sin chips amarillos.

## Cambios realizados

### Frontend
Archivo modificado:
- `frontend/src/components/Layout.tsx`
- `frontend/src/styles/finanfix-brand-2026.css`

### Ajustes visuales
- Se eliminan visualmente los chips amarillos de usuario/mandante.
- Se reemplaza la zona derecha por un menú desplegable profesional.
- El menú muestra:
  - Avatar con iniciales.
  - Nombre del usuario.
  - Perfil/rol.
  - Email.
  - Mandante o cantidad de mandantes asignados.
  - Botón `Cerrar sesión`.
- Se mejora la alineación del topbar para todos los roles:
  - admin
  - interno
  - kam_admin
  - kam
  - cliente

## Validación
Frontend validado con:

```powershell
cd frontend
npm install
npm run build
```

Resultado: OK.

## SQL
No requiere SQL nuevo.
