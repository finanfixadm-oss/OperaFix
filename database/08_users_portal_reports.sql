-- OperaFix v55 - Control de usuarios + portal cliente + módulo de informes
-- Este script es opcional porque el backend crea la tabla si no existe.
create table if not exists operafix_users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  role text not null default 'admin',
  mandante_id text null,
  mandante_name text null,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists idx_operafix_users_role on operafix_users(role);
create index if not exists idx_operafix_users_mandante on operafix_users(mandante_id, mandante_name);
