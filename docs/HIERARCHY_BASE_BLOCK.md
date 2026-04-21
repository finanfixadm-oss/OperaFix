# OperaFix · Bloque jerarquía base

Este bloque agrega la base navegable del CRM:

- Mandantes
- Grupos de empresas
- Empresas
- Relaciones grupo↔empresa
- Líneas de gestión (LM / TP)
- AFPs por línea

## Flujo objetivo

Mandante → Grupo de empresa → Empresa → Línea de gestión → AFP → Gestión

## Endpoints nuevos

- GET/POST `/api/mandantes`
- GET/POST `/api/company-groups`
- POST `/api/company-groups/:id/companies`
- GET `/api/hierarchy/overview`

## Frontend nuevo

- `/mandantes`
- `/company-groups`
- `/jerarquia`

## Siguiente bloque recomendado

1. Gestión de asignación de empresas dentro de grupos
2. Creación de líneas LM/TP desde empresa
3. AFPs dentro de la línea
4. Gestiones por AFP con documentos adjuntos
