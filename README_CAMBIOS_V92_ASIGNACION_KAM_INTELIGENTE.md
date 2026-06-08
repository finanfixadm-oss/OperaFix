# OperaFix V92 - Asignación Inteligente KAM

## Qué se agregó

Se incorporó un nuevo módulo en el menú llamado **KAM / Asignación KAM** con la ruta:

`/kam-asignacion`

El módulo permite administrar empresas comerciales con las columnas solicitadas:

- RUT
- Razón Social
- Nro Empleados
- Monto Devolución
- Nombre contacto
- Cargo
- Correo
- Nro Telefónico
- Estado
- Observación
- Rubro
- Región

Además se agregaron campos comerciales para segmentación y asignación:

- Prioridad
- Score empresa
- Segmento empresa
- Segmento monto
- Tipo oportunidad
- Origen / canal origen
- KAM asignado
- KAM administrador
- Probabilidad de cierre
- Próxima gestión

## Modelo de asignación

El sistema calcula automáticamente un **score de empresa** de 0 a 100 considerando:

- Cantidad de trabajadores
- Monto potencial de devolución
- Rubro
- Región
- Tipo de oportunidad: recuperaciones, venta, licitación, campaña o referido

Luego clasifica la empresa como:

- Baja
- Media
- Alta
- Estratégica

## Ranking KAM

Se agregó una pantalla para configurar el perfil de experiencia de cada KAM vendedor:

- Nivel: Junior, Semi senior, Senior, Experto
- Experiencia en licitaciones
- Experiencia en ventas
- Experiencia en recuperaciones
- Experiencia con empresas grandes
- Experiencia con empresas pequeñas
- Rubros fuertes
- Regiones fuertes
- Capacidad máxima de cartera
- Tasa de cierre
- Monto cerrado histórico

El sistema calcula un **ranking KAM** automático.

## Recomendación de KAM

Desde la tabla de empresas, el KAM administrador puede presionar **Recomendar**. El sistema compara:

- Rubro de la empresa contra rubros fuertes del KAM
- Región de la empresa contra regiones fuertes del KAM
- Tipo de oportunidad contra experiencia del KAM
- Tamaño de empresa y monto de devolución contra experiencia en empresas grandes o pequeñas
- Ranking comercial
- Carga actual de cartera

Luego muestra los mejores KAM recomendados con score de compatibilidad y motivos.

## Reglas comerciales

Se agregó una pantalla de reglas para dejar configurables criterios como:

- Monto devolución mayor a cierto valor
- Nro empleados mayor a cierto valor
- Rubro específico
- Región específica
- Tipo de oportunidad licitación
- Carga actual del KAM

Las reglas quedan guardadas en `operafix_kam_assignment_rules` para escalar el motor de asignación.

## Base de datos

El backend crea automáticamente las tablas al usar `/api/kam`, pero también se dejó el script manual:

`database/10_kam_assignment_intelligence.sql`

## Archivos principales modificados

- `backend/src/routes/kam.ts`
- `backend/src/app.ts`
- `backend/dist/routes/kam.js`
- `backend/dist/app.js`
- `frontend/src/pages/KamAssignmentPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/auth.ts`
- `frontend/src/components/Layout.tsx`
- `frontend/src/styles/zoho-modules.css`
- `database/10_kam_assignment_intelligence.sql`

## Nota de instalación

Si el proyecto no trae `node_modules`, ejecutar:

Backend:

```bash
cd backend
npm install
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run build
```
