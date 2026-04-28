# OperaFix v32 - Dashboard Builder tipo Zoho

Esta versión mejora el dashboard para crear paneles como Zoho:

- Crear paneles personalizados tipo tabla, gráfico circular, barras o KPI.
- Selector de módulo con lista estilo Zoho.
- Medida flexible: cantidad, suma, promedio, mínimo o máximo de campos numéricos/montos.
- Agrupamientos múltiples, incluyendo fechas por año, mes o día.
- Filtros propios por panel con criterio Y/O y patrón visible.
- Vista previa antes de guardar.
- Editar, clonar y eliminar paneles.
- Mensaje visible cuando un panel no tiene datos por sus filtros.
- Los paneles se guardan por mandante seleccionado.

Archivo principal modificado:

- frontend/src/pages/DashboardExecutivePage.tsx
- frontend/src/styles/zoho-modules.css

Notas:

- El módulo de datos funcional es `Registros de empresas`; los demás módulos aparecen como opciones referenciales para dejar la experiencia similar a Zoho.
- Para filtros con múltiples valores, escribe los valores separados por coma. Ejemplo: `AFP CAPITAL, AFP MODELO`.
- Para replicar el ejemplo de estado de pago, usa:
  - Tipo: Gráfico de tablas
  - Medida: Suma de Monto real Finanfix Solutions
  - Agrupamientos: Facturado cliente + Fecha pago factura Finanfix por año
  - Filtros: Entidad es AFP CAPITAL, AFP MODELO; Estado Gestión es Pagado; Mandante es Optimiza Consulting.
