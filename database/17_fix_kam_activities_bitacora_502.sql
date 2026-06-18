-- OperaFix V122 - Fix bitácora KAM 502 / Failed to fetch
-- Repara estructura mínima de bitácora y empresas KAM sin borrar datos.

CREATE TABLE IF NOT EXISTS operafix_kam_activities (
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

ALTER TABLE IF EXISTS operafix_kam_activities
  ADD COLUMN IF NOT EXISTS company_id text,
  ADD COLUMN IF NOT EXISTS kam_id text,
  ADD COLUMN IF NOT EXISTS tipo_gestion text DEFAULT 'Seguimiento',
  ADD COLUMN IF NOT EXISTS resultado text,
  ADD COLUMN IF NOT EXISTS proxima_accion text,
  ADD COLUMN IF NOT EXISTS proxima_gestion date,
  ADD COLUMN IF NOT EXISTS estado_venta text,
  ADD COLUMN IF NOT EXISTS probabilidad_cierre integer,
  ADD COLUMN IF NOT EXISTS observacion text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS operafix_kam_companies
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'Sin asignar',
  ADD COLUMN IF NOT EXISTS resultado_gestion text,
  ADD COLUMN IF NOT EXISTS proxima_gestion date,
  ADD COLUMN IF NOT EXISTS probabilidad_cierre integer,
  ADD COLUMN IF NOT EXISTS motivo_perdida text,
  ADD COLUMN IF NOT EXISTS observacion text,
  ADD COLUMN IF NOT EXISTS fecha_ultimo_contacto timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_operafix_kam_activities_company ON operafix_kam_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_operafix_kam_activities_kam ON operafix_kam_activities(kam_id);
