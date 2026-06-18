# OperaFix V125 - Rediseño visual Finanfix Brand Board 2026

## Objetivo
Aplicar una capa visual global a todo el CRM para que la interfaz quede más profesional y alineada con la marca Finanfix Solutions SpA.

## Base de marca aplicada
- Color principal: `#0900CC`
- Celeste acento: `#5CCCF0`
- Fondo claro: `#F0F7FF`
- Texto principal: `#333333`
- Gama secundaria: `#4EACF6`, `#408AEE`, `#3368E8`, `#2545DD`, `#1723D5`
- Tipografías: `MuseoModerno` para marca/títulos y `Darker Grotesque` para interfaz.

## Archivos modificados
- `frontend/src/main.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/styles/finanfix-brand-2026.css`

## Cambios principales
1. Nueva capa visual global para todos los módulos.
2. Topbar con degradado Finanfix.
3. Sidebar más profesional, con logo Finanfix y tarjetas de navegación.
4. Botones, inputs, selects, filtros y tablas con estilo unificado.
5. Tarjetas, dashboards, KPIs y modales con bordes suaves, sombras y fondo de marca.
6. Login rediseñado visualmente con identidad Finanfix.
7. Módulo KAM adaptado a la paleta oficial Finanfix.
8. Scrollbars, badges, pestañas, estados y tablas armonizados.

## Validación
Frontend validado con:

```powershell
cd frontend
npm install
npm run build
```

Resultado: build OK.

No requiere SQL ni cambios de backend.
