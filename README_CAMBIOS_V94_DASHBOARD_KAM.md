# OperaFix V94 - Dashboard KAM administrador

## Cambios incluidos

### 1. Dashboard comercial KAM
Se agregó una vista de dashboard dentro del módulo **KAM / Asignación KAM** para que el KAM administrador pueda medir el estado comercial de cada vendedor.

Incluye:
- Empresas filtradas.
- Empresas en gestión.
- Empresas ganadas.
- Empresas perdidas.
- Gestiones vencidas.
- Empresas asignadas sin primer contacto.
- Probabilidad promedio.
- Monto ganado.

### 2. Filtros comerciales
Se agregaron filtros globales para el módulo KAM:
- Buscar por RUT, razón social, rubro, región, correo o teléfono.
- KAM vendedor.
- Estado de venta.
- Rubro.
- Región.
- Prioridad.
- Tamaño de empresa.
- Vista rápida: sin asignar, estratégicas, gestiones vencidas, sin primer contacto, ganadas, perdidas y reasignar.

Los filtros afectan tanto el dashboard como la tabla de empresas.

### 3. Embudo de ventas por estado
El dashboard ahora muestra el embudo comercial por estado:
- Sin asignar.
- Asignada.
- Pendiente de contacto.
- En prospección.
- Contactada.
- Interesada.
- Reunión agendada.
- Propuesta enviada.
- En negociación.
- Ganada.
- Perdida.
- Congelada.
- Reasignar.

### 4. Seguimiento por KAM
Se agregó una tabla de medición por KAM con:
- Empresas asignadas.
- Empresas activas / en gestión.
- Ganadas.
- Perdidas.
- Gestiones vencidas.
- Empresas sin primer contacto.
- Probabilidad promedio.
- Conversión.
- Monto potencial.
- Monto ganado.

### 5. Empresas críticas
Se agregó una vista de alertas para empresas que requieren acción:
- Próxima gestión vencida.
- Asignada sin primer contacto.
- Marcada como Reasignar.

### 6. Accesos recomendados
Se ajustó el acceso visual y de rutas para separar el mundo operativo del mundo comercial:

- **KAM vendedor**: accede solo al módulo KAM.
- **KAM administrador**: accede al módulo KAM y Usuarios para crear/administrar KAM vendedores.
- **Admin / Interno**: mantienen acceso operativo normal.
- **Cliente**: mantiene acceso al portal cliente e informes.

Esto evita que los KAM vendedores vean módulos operativos que no necesitan y concentra su trabajo en sus empresas asignadas.

## Comandos sugeridos

Backend:
```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\backend
npm install
npm run build
```

Frontend:
```powershell
cd C:\Users\Master\Desktop\OperaFix\OperaFix\frontend
npm install
npm run build
```
