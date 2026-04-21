# OperaFix vNext - Rediseño basado en Zoho

## Jerarquía operacional
Mandante -> Grupo de empresa -> Empresa/Razón social -> Línea de gestión (LM/TP) -> AFP -> Gestión -> Documentos / Notas / Actividad.

## Perfiles
- super_admin: administra todo
- worker: opera registros y documentos
- mandante: visibilidad restringida a su propio mandante

## Decisiones del rediseño
1. Los documentos generales viven en el explorador del módulo Documentos.
2. Los documentos operativos (OC, factura, detalle de trabajadores, archivo AFP, comprobante, etc.) se asocian a una gestión específica, no a la carpeta general.
3. La base actual de Railway sigue funcionando con lm_records, lm_groups, companies, collaborators, tp_groups y tp_records.
4. Se agrega un esquema vNext en SQL para evolucionar sin romper la producción actual.

## Módulos del CRM
- Inicio
- Empresas
- Colaboradores
- Documentos
- Grupos de empresas - LM
- Registros de empresas
- Grupos empresas - TP
- Gestiones - TP
- Informes
- Análisis
- Mis solicitudes

## Qué sí queda listo en este paquete
- Frontend compilable con Home, Informes y Análisis conectados al backend real.
- Layout tipo Zoho con barra superior, sidebar y módulos.
- Módulo Documentos con explorador local por módulo/mandante y subida real al backend.
- Backend compilable y estable.
- SQL de evolución vNext basado en la jerarquía real requerida.

## Qué falta para una fase posterior
- Login completo con permisos por perfil
- Persistencia de carpetas en DB
- Importador automático desde ZIP/CSV de Zoho
- Relaciones de documentos específicos por gestión LM/TP mediante UI avanzada
- Dashboards configurables tipo Zoho
