-- OperaFix V100/V101 - KAM campañas, importación/exportación Excel y agenda comercial

create table if not exists operafix_kam_campaigns (
  id text primary key,
  nombre text not null,
  descripcion text,
  estado text not null default 'Activa',
  fecha_inicio date,
  fecha_fin date,
  objetivo_monto numeric(18,2),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table operafix_kam_companies add column if not exists campaign_id text;

create index if not exists idx_operafix_kam_campaigns_estado on operafix_kam_campaigns(estado);
create index if not exists idx_operafix_kam_companies_campaign on operafix_kam_companies(campaign_id);
