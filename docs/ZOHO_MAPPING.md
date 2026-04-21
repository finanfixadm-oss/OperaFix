# OperaFix · Mapeo funcional desde Zoho

## Perfiles considerados
- **super_admin**: ve y administra todo.
- **worker**: opera gestiones, documentos, notas y seguimiento.
- **mandante**: ve solo sus empresas, grupos, registros y documentos.

## Módulos base
- Inicio
- Módulos
- Informes
- Análisis
- Mis solicitudes

## Módulos operativos
- Empresas
- Colaboradores
- Documentos
- Grupos de empresas - LM
- Registros de empresas
- Grupos empresas - TP
- Gestiones - TP

## Relaciones funcionales principales
- Un **mandante** agrupa empresas, grupos LM y grupos TP.
- Una **empresa** puede tener múltiples colaboradores y documentos.
- Un **grupo LM** agrupa registros LM.
- Un **registro LM** contiene estados, montos, confirmaciones, notas, actividades y documentos.
- Un **grupo TP** agrupa gestiones TP.
- Una **gestión TP** contiene estados, comentarios y documentos asociados.

## Campos LM importantes
- RUT
- Razón Social
- Entidad
- Estado Gestión
- Monto Devolución
- Confirmación CC
- Confirmación Poder
- Monto Real Pagado
- Motivo
- Estado Trabajador
- N° Solicitud
- Banco
- Número cuenta
- Tipo de Cuenta
- Mandante
- Acceso portal
- Comentario

## Campos de grupo LM importantes
- Nombre de Grupo de empresa - LM
- Correo secundario
- Mandante
- Grupos asociados

## Documentos
La primera versión del explorador de documentos queda organizada por módulo y mandante.
La siguiente iteración puede persistir carpetas reales en base de datos y permisos por perfil.
