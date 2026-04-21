-- OperaFix vNext: jerarquía real basada en el modelo Zoho
create extension if not exists "pgcrypto";

create table if not exists mandantes (
  id uuid primary key default gen_random_uuid(),
  name varchar(180) not null unique,
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_groups (
  id uuid primary key default gen_random_uuid(),
  mandante_id uuid not null references mandantes(id) on delete cascade,
  group_type varchar(10) not null check (group_type in ('LM','TP')),
  name varchar(255) not null,
  owner_name varchar(150),
  owner_user_id uuid,
  secondary_email varchar(180),
  group_power_file varchar(255),
  groups_related text,
  campaign varchar(150),
  email_opt_out boolean not null default false,
  tag varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mandante_id, group_type, name)
);

create table if not exists business_entities (
  id uuid primary key default gen_random_uuid(),
  mandante_id uuid not null references mandantes(id) on delete cascade,
  group_id uuid references company_groups(id) on delete set null,
  rut varchar(20),
  business_name varchar(255) not null,
  owner_name varchar(150),
  owner_user_id uuid,
  address text,
  email varchar(180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists management_lines (
  id uuid primary key default gen_random_uuid(),
  business_entity_id uuid not null references business_entities(id) on delete cascade,
  line_type varchar(10) not null check (line_type in ('LM','TP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_entity_id, line_type)
);

create table if not exists management_entities (
  id uuid primary key default gen_random_uuid(),
  management_line_id uuid not null references management_lines(id) on delete cascade,
  afp_name varchar(120) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(management_line_id, afp_name)
);

create table if not exists management_cases (
  id uuid primary key default gen_random_uuid(),
  management_entity_id uuid not null references management_entities(id) on delete cascade,
  case_type varchar(10) not null check (case_type in ('LM','TP')),
  rut varchar(20),
  business_name varchar(255),
  management_status varchar(120),
  worker_status varchar(100),
  request_number varchar(100),
  refund_amount numeric(18,2) default 0,
  actual_paid_amount numeric(18,2) default 0,
  actual_finanfix_amount numeric(18,2) default 0,
  confirmation_cc boolean default false,
  confirmation_power boolean default false,
  bank_name varchar(120),
  account_number varchar(100),
  account_type varchar(80),
  comment text,
  portal_access varchar(100),
  cen_query varchar(120),
  cen_response varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists management_case_documents (
  id uuid primary key default gen_random_uuid(),
  management_case_id uuid not null references management_cases(id) on delete cascade,
  document_type varchar(120) not null,
  title varchar(255) not null,
  original_filename varchar(255),
  storage_path text,
  created_at timestamptz not null default now()
);
