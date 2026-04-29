OperaFix v58 base corregida completa.

Correcciones:
- backend/src/utils/number.ts creado.
- frontend/src/utils/number.ts creado.
- imports frontend '@/utils/number' corregidos a rutas relativas.
- import backend '../utils/number.js' compatible con NodeNext.
- límite 500 cambiado a 5000 en take/slice/limit.
- dashboard reforzado con parseMoney para campos monetarios.
- carga masiva reforzada para campos CRM principales cuando usa mapRow.

Validación:
cd backend
npm run build

cd ../frontend
npm run build
