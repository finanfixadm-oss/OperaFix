-- V99 - Contactos múltiples, LinkedIn, teléfono central y control de duplicados KAM

alter table if exists operafix_kam_companies
  add column if not exists telefono_central text,
  add column if not exists linkedin_url text;

create table if not exists operafix_kam_company_contacts (
  id text primary key,
  company_id text not null,
  nombre text not null,
  cargo text,
  correo text,
  telefono_contacto text,
  linkedin_url text,
  es_principal boolean not null default false,
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operafix_kam_contacts_company
  on operafix_kam_company_contacts(company_id);

-- Nota: el backend valida duplicados por RUT normalizado y razón social antes de crear/editar.
-- No se fuerza un índice único aquí para no romper bases existentes que ya tengan duplicados históricos.
