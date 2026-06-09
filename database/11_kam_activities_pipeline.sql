-- OperaFix V95 - Bitácora, tareas y tablero comercial KAM
-- Este script es opcional: el backend también crea/actualiza estas tablas automáticamente.

create table if not exists operafix_kam_activities (
  id text primary key,
  company_id text not null,
  kam_id text,
  tipo_gestion text not null default 'Seguimiento',
  resultado text,
  proxima_accion text,
  proxima_gestion date,
  estado_venta text,
  probabilidad_cierre integer,
  observacion text,
  created_at timestamptz not null default now()
);

create index if not exists idx_operafix_kam_activities_company on operafix_kam_activities(company_id);
create index if not exists idx_operafix_kam_activities_kam on operafix_kam_activities(kam_id);
