# OperaFix - Fix solo Portal Cliente

Este paquete modifica solo:

- frontend/src/styles/zoho-modules.css
- frontend/src/pages/ClientPortalPage.tsx

No toca Dashboard, Registros, Layout, App ni main.

Corrige visualmente:

- Vista Tarjetas del Portal Cliente
- Vista Kanban del Portal Cliente
- Vista Tabla del Portal Cliente
- Chips / semáforos
- Scroll vertical y horizontal de tabla
- Tabla redimensionable verticalmente

Comandos:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd ..
git add .
git commit -m "Fix portal cliente visual only"
git push
```
