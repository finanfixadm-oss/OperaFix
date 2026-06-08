-- OperaFix V92 - Módulo Asignación Inteligente KAM
-- Este script es opcional: el backend también crea estas tablas automáticamente al entrar al módulo /api/kam.

create table if not exists operafix_kam_profiles (
  id text primary key,
  user_id text not null unique references operafix_users(id) on delete cascade,
  nivel_experiencia text not null default 'Junior',
  experiencia_licitaciones integer not null default 0,
  experiencia_ventas integer not null default 0,
  experiencia_recuperaciones integer not null default 0,
  experiencia_empresas_grandes integer not null default 0,
  experiencia_empresas_pequenas integer not null default 0,
  rubros_experiencia text[] not null default '{}',
  regiones_experiencia text[] not null default '{}',
  capacidad_maxima integer not null default 30,
  tasa_cierre numeric(5,2) not null default 0,
  monto_cerrado_historico numeric(18,2) not null default 0,
  ranking_kam integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operafix_kam_companies (
  id text primary key,
  rut text not null,
  razon_social text not null,
  nro_empleados integer,
  monto_devolucion numeric(18,2),
  nombre_contacto text,
  cargo_contacto text,
  correo text,
  telefono text,
  estado text not null default 'Sin asignar',
  observacion text,
  rubro text,
  region text,
  prioridad text,
  score_empresa integer not null default 0,
  segmento_empresa text,
  segmento_monto text,
  tipo_oportunidad text,
  origen text,
  kam_asignado_id text references operafix_users(id) on delete set null,
  kam_admin_id text references operafix_users(id) on delete set null,
  fecha_asignacion timestamptz,
  fecha_ultimo_contacto timestamptz,
  proxima_gestion date,
  resultado_gestion text,
  motivo_perdida text,
  probabilidad_cierre integer,
  canal_origen text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operafix_kam_companies_rut on operafix_kam_companies(rut);
create index if not exists idx_operafix_kam_companies_kam on operafix_kam_companies(kam_asignado_id);
create index if not exists idx_operafix_kam_companies_score on operafix_kam_companies(score_empresa);

create table if not exists operafix_kam_assignment_rules (
  id text primary key,
  nombre_regla text not null,
  criterio text not null,
  operador text not null default '=',
  valor text,
  peso integer not null default 10,
  accion text not null default 'priorizar',
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operafix_kam_assignment_history (
  id text primary key,
  empresa_id text not null references operafix_kam_companies(id) on delete cascade,
  kam_anterior_id text,
  kam_nuevo_id text,
  kam_admin_id text,
  motivo_asignacion text,
  score_match integer,
  observacion text,
  created_at timestamptz not null default now()
);
