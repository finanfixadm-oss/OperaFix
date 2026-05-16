# OperaFix - Dashboard Only Fix

Reemplaza estos archivos solamente:

- `frontend/src/pages/DashboardExecutivePage.tsx`
- `frontend/src/pages/dashboard-executive-pro.css`

No modifica Portal Cliente, Registros, App, main ni Layout.

Luego ejecuta:

```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm run build

cd ..
git add .
git commit -m "Fix dashboard executive styles only"
git push
```

Después usa Ctrl + F5 en el navegador.
