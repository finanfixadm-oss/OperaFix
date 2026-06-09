create table if not exists operafix_kam_deleted_companies (
  id text primary key,
  kam_company_id text,
  source_company_id text,
  source_mandante_id text,
  source_mandante_name text,
  rut text,
  rut_normalized text,
  razon_social text,
  razon_social_normalized text,
  deleted_by text,
  delete_source_attempted boolean not null default false,
  source_deleted boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_operafix_kam_deleted_source on operafix_kam_deleted_companies(source_company_id);
create index if not exists idx_operafix_kam_deleted_rut on operafix_kam_deleted_companies(rut_normalized);
create index if not exists idx_operafix_kam_deleted_name on operafix_kam_deleted_companies(razon_social_normalized);
