create table if not exists mandantes (
  id uuid primary key default gen_random_uuid(),
  name varchar(180) unique not null,
  code varchar(80) unique,
  status varchar(80) default 'Activo',
  owner_name varchar(180),
  commercial_name varchar(180),
  email varchar(180),
  phone varchar(80),
  tag varchar(100),
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists company_groups (
  id uuid primary key default gen_random_uuid(),
  mandante_id uuid not null references mandantes(id) on delete cascade,
  name varchar(255) not null,
  kind varchar(30) not null default 'LM',
  owner_name varchar(180),
  campaign_name varchar(180),
  secondary_email varchar(180),
  power_group text,
  related_groups text,
  tag varchar(100),
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(mandante_id, name, kind)
);

alter table companies add column if not exists mandante_id uuid references mandantes(id);

create table if not exists company_group_companies (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references company_groups(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  owner_name varchar(180),
  default_entity varchar(120),
  real_finanfix_amount numeric(18,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(group_id, company_id)
);

create table if not exists management_lines (
  id uuid primary key default gen_random_uuid(),
  mandante_id uuid references mandantes(id),
  group_id uuid references company_groups(id),
  company_id uuid not null references companies(id),
  kind varchar(20) not null,
  name varchar(180),
  status varchar(120),
  comments text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists management_line_afps (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references management_lines(id) on delete cascade,
  afp_name varchar(120) not null,
  status varchar(120),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(line_id, afp_name)
);
