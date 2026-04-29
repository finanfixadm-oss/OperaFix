create table if not exists operafix_audit_logs (
  id text primary key,
  user_id text null,
  user_email text null,
  user_role text null,
  mandante_id text null,
  mandante_name text null,
  action text not null,
  module text not null,
  record_id text null,
  detail text null,
  ip text null,
  user_agent text null,
  created_at timestamp not null default now()
);

create index if not exists idx_operafix_audit_created_at on operafix_audit_logs(created_at desc);
create index if not exists idx_operafix_audit_user_email on operafix_audit_logs(user_email);
create index if not exists idx_operafix_audit_mandante on operafix_audit_logs(mandante_id, mandante_name);
