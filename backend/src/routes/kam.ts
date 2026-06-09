import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { parseSession } from "../middleware/security.js";
import { ensureUsersTable } from "./auth.js";

const kamRouter = Router();

type SessionLike = { id?: string; sub?: string; role?: string; assigned_mandante_ids?: string[]; mandante_id?: string | null } | null;

type KamProfile = {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  nivel_experiencia: string;
  experiencia_licitaciones: number;
  experiencia_ventas: number;
  experiencia_recuperaciones: number;
  experiencia_empresas_grandes: number;
  experiencia_empresas_pequenas: number;
  rubros_experiencia: string[] | null;
  regiones_experiencia: string[] | null;
  capacidad_maxima: number;
  tasa_cierre: number;
  monto_cerrado_historico: string | number | null;
  ranking_kam: number;
  activo: boolean;
  carga_actual?: number;
  score_match?: number;
  motivos?: string[];
};

type KamCompany = {
  id: string;
  rut: string;
  razon_social: string;
  nro_empleados?: number | null;
  monto_devolucion?: string | number | null;
  nombre_contacto?: string | null;
  cargo_contacto?: string | null;
  correo?: string | null;
  telefono?: string | null;
  estado?: string | null;
  observacion?: string | null;
  rubro?: string | null;
  region?: string | null;
  prioridad?: string | null;
  score_empresa?: number | null;
  segmento_empresa?: string | null;
  segmento_monto?: string | null;
  tipo_oportunidad?: string | null;
  origen?: string | null;
  kam_asignado_id?: string | null;
  kam_admin_id?: string | null;
  fecha_asignacion?: string | null;
  fecha_ultimo_contacto?: string | null;
  proxima_gestion?: string | null;
  resultado_gestion?: string | null;
  motivo_perdida?: string | null;
  probabilidad_cierre?: number | null;
  canal_origen?: string | null;
};

const ROLE_KAM_ADMIN = "kam_admin";
const ROLE_KAM = "kam";
const FINANFIX_MANDANTE_PATTERNS = ["%finanfix solutions spa%", "%finanfix solutions%", "%finanfix%"];

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function pgQuote(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `select to_regclass($1)::text as name`,
    `public.${tableName}`
  ).catch(() => [] as any[]);
  return Boolean(rows[0]?.name);
}

async function columnExists(tableName: string, columnName: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `select 1 as ok from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = $2 limit 1`,
    tableName,
    columnName
  ).catch(() => [] as any[]);
  return Boolean(rows[0]);
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  await prisma.$executeRawUnsafe(`alter table ${pgQuote(tableName)} add column if not exists ${pgQuote(columnName)} ${definition}`);
}

function sessionUserId(session: any) {
  return String(session?.id || session?.sub || "");
}

function isAdmin(session: SessionLike) {
  return String(session?.role || "").toLowerCase() === "admin";
}

function isKamAdmin(session: SessionLike) {
  return String(session?.role || "").toLowerCase() === ROLE_KAM_ADMIN;
}

function isKam(session: SessionLike) {
  return String(session?.role || "").toLowerCase() === ROLE_KAM;
}

function requireKamAccess(req: any, res: any) {
  const session = (req.user || parseSession(req)) as SessionLike;
  if (!session) {
    res.status(401).json({ message: "Debes iniciar sesión." });
    return null;
  }
  const role = String(session.role || "").toLowerCase();
  if (!["admin", "interno", ROLE_KAM_ADMIN, ROLE_KAM].includes(role)) {
    res.status(403).json({ message: "No tienes acceso al módulo KAM." });
    return null;
  }
  return session;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function integerOrNull(value: unknown) {
  const n = numberOrNull(value);
  return n === null ? null : Math.round(n);
}

function strOrNull(value: unknown) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function segmentEmployees(n?: number | null) {
  if (!n || n <= 0) return "Sin información";
  if (n <= 9) return "Microempresa";
  if (n <= 49) return "Pequeña";
  if (n <= 199) return "Mediana";
  if (n <= 999) return "Grande";
  return "Corporativa";
}

function segmentAmount(value?: number | null) {
  if (!value || value <= 0) return "Sin información";
  if (value <= 1000000) return "Bajo";
  if (value <= 5000000) return "Medio";
  if (value <= 20000000) return "Alto";
  return "Estratégico";
}

function companyScore(input: { nro_empleados?: number | null; monto_devolucion?: number | null; rubro?: string | null; region?: string | null; tipo_oportunidad?: string | null }) {
  const employees = input.nro_empleados || 0;
  const amount = input.monto_devolucion || 0;
  let score = 0;
  if (employees >= 1000) score += 30;
  else if (employees >= 200) score += 24;
  else if (employees >= 50) score += 16;
  else if (employees >= 10) score += 9;
  else if (employees > 0) score += 4;

  if (amount > 20000000) score += 40;
  else if (amount > 5000000) score += 30;
  else if (amount > 1000000) score += 18;
  else if (amount > 0) score += 8;

  const rubro = String(input.rubro || "").toLowerCase();
  if (["minería", "mineria", "construcción", "construccion", "industrial", "servicios", "retail"].some((x) => rubro.includes(x))) score += 15;
  else if (rubro) score += 8;

  if (input.region) score += 5;
  const tipo = String(input.tipo_oportunidad || "").toLowerCase();
  if (tipo.includes("licit")) score += 10;
  else if (tipo.includes("recuper")) score += 6;
  else if (tipo) score += 4;

  return Math.min(100, Math.round(score));
}

function priority(score: number) {
  if (score >= 80) return "Estratégica";
  if (score >= 60) return "Alta";
  if (score >= 40) return "Media";
  return "Baja";
}

function profileRanking(input: any) {
  const avgExperience = [
    Number(input.experiencia_licitaciones || 0),
    Number(input.experiencia_ventas || 0),
    Number(input.experiencia_recuperaciones || 0),
    Number(input.experiencia_empresas_grandes || 0),
    Number(input.experiencia_empresas_pequenas || 0),
  ].reduce((a, b) => a + b, 0) / 5;
  const tasa = Math.min(100, Number(input.tasa_cierre || 0));
  const historico = Math.min(100, Math.log10(Math.max(1, Number(input.monto_cerrado_historico || 0))) * 7);
  const levelBoost = String(input.nivel_experiencia || "").toLowerCase().includes("experto") ? 12 : String(input.nivel_experiencia || "").toLowerCase().includes("senior") ? 8 : String(input.nivel_experiencia || "").toLowerCase().includes("semi") ? 4 : 0;
  return Math.min(100, Math.round(avgExperience * 12 + tasa * 0.25 + historico * 0.15 + levelBoost));
}

async function ensureKamTables() {
  await ensureUsersTable();

  await prisma.$executeRawUnsafe(`
    create table if not exists operafix_kam_profiles (
      id text primary key,
      user_id text not null unique,
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
    )
  `);

  await prisma.$executeRawUnsafe(`
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
      kam_asignado_id text,
      kam_admin_id text,
      fecha_asignacion timestamptz,
      fecha_ultimo_contacto timestamptz,
      proxima_gestion date,
      resultado_gestion text,
      motivo_perdida text,
      probabilidad_cierre integer,
      canal_origen text,
      source_company_id text,
      source_mandante_id text,
      source_mandante_name text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await prisma.$executeRawUnsafe(`
    create table if not exists operafix_kam_assignment_rules (
      id text primary key,
      nombre_regla text not null default 'Nueva regla',
      criterio text not null default 'monto_devolucion',
      operador text not null default '=',
      valor text,
      peso integer not null default 10,
      accion text not null default 'priorizar',
      activa boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await prisma.$executeRawUnsafe(`
    create table if not exists operafix_kam_assignment_history (
      id text primary key,
      empresa_id text not null,
      kam_anterior_id text,
      kam_nuevo_id text,
      kam_admin_id text,
      motivo_asignacion text,
      score_match integer,
      observacion text,
      created_at timestamptz not null default now()
    )
  `);


  await prisma.$executeRawUnsafe(`
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
    )
  `);

  const profileColumns: Array<[string, string]> = [
    ['user_id', 'text'], ['nivel_experiencia', `text not null default 'Junior'`], ['experiencia_licitaciones', 'integer not null default 0'],
    ['experiencia_ventas', 'integer not null default 0'], ['experiencia_recuperaciones', 'integer not null default 0'], ['experiencia_empresas_grandes', 'integer not null default 0'],
    ['experiencia_empresas_pequenas', 'integer not null default 0'], ['rubros_experiencia', `text[] not null default '{}'`], ['regiones_experiencia', `text[] not null default '{}'`],
    ['capacidad_maxima', 'integer not null default 30'], ['tasa_cierre', 'numeric(5,2) not null default 0'], ['monto_cerrado_historico', 'numeric(18,2) not null default 0'],
    ['ranking_kam', 'integer not null default 0'], ['activo', 'boolean not null default true'], ['created_at', 'timestamptz not null default now()'], ['updated_at', 'timestamptz not null default now()'],
  ];
  for (const [col, def] of profileColumns) await addColumnIfMissing('operafix_kam_profiles', col, def);

  const companyColumns: Array<[string, string]> = [
    ['rut', 'text'], ['razon_social', 'text'], ['nro_empleados', 'integer'], ['monto_devolucion', 'numeric(18,2)'], ['nombre_contacto', 'text'],
    ['cargo_contacto', 'text'], ['correo', 'text'], ['telefono', 'text'], ['estado', `text not null default 'Sin asignar'`], ['observacion', 'text'], ['rubro', 'text'], ['region', 'text'],
    ['prioridad', 'text'], ['score_empresa', 'integer not null default 0'], ['segmento_empresa', 'text'], ['segmento_monto', 'text'], ['tipo_oportunidad', 'text'], ['origen', 'text'],
    ['kam_asignado_id', 'text'], ['kam_admin_id', 'text'], ['fecha_asignacion', 'timestamptz'], ['fecha_ultimo_contacto', 'timestamptz'], ['proxima_gestion', 'date'],
    ['resultado_gestion', 'text'], ['motivo_perdida', 'text'], ['probabilidad_cierre', 'integer'], ['canal_origen', 'text'], ['source_company_id', 'text'], ['source_mandante_id', 'text'],
    ['source_mandante_name', 'text'], ['created_at', 'timestamptz not null default now()'], ['updated_at', 'timestamptz not null default now()'],
  ];
  for (const [col, def] of companyColumns) await addColumnIfMissing('operafix_kam_companies', col, def);

  const ruleColumns: Array<[string, string]> = [
    ['nombre_regla', `text not null default 'Nueva regla'`], ['criterio', `text not null default 'monto_devolucion'`], ['operador', `text not null default '='`],
    ['valor', 'text'], ['peso', 'integer not null default 10'], ['accion', `text not null default 'priorizar'`], ['activa', 'boolean not null default true'],
    ['created_at', 'timestamptz not null default now()'], ['updated_at', 'timestamptz not null default now()'],
  ];
  for (const [col, def] of ruleColumns) await addColumnIfMissing('operafix_kam_assignment_rules', col, def);

  const historyColumns: Array<[string, string]> = [
    ['empresa_id', 'text'], ['kam_anterior_id', 'text'], ['kam_nuevo_id', 'text'], ['kam_admin_id', 'text'], ['motivo_asignacion', 'text'],
    ['score_match', 'integer'], ['observacion', 'text'], ['created_at', 'timestamptz not null default now()'],
  ];
  for (const [col, def] of historyColumns) await addColumnIfMissing('operafix_kam_assignment_history', col, def);

  const activityColumns: Array<[string, string]> = [
    ['company_id', 'text'], ['kam_id', 'text'], ['tipo_gestion', `text not null default 'Seguimiento'`], ['resultado', 'text'],
    ['proxima_accion', 'text'], ['proxima_gestion', 'date'], ['estado_venta', 'text'], ['probabilidad_cierre', 'integer'],
    ['observacion', 'text'], ['created_at', 'timestamptz not null default now()'],
  ];
  for (const [col, def] of activityColumns) await addColumnIfMissing('operafix_kam_activities', col, def);

  await prisma.$executeRawUnsafe(`create index if not exists idx_operafix_kam_activities_company on operafix_kam_activities(company_id)`).catch(() => null);
  await prisma.$executeRawUnsafe(`create index if not exists idx_operafix_kam_activities_kam on operafix_kam_activities(kam_id)`).catch(() => null);

  await prisma.$executeRawUnsafe(`create index if not exists idx_operafix_kam_companies_rut on operafix_kam_companies(rut)`).catch(() => null);
  await prisma.$executeRawUnsafe(`create index if not exists idx_operafix_kam_companies_kam on operafix_kam_companies(kam_asignado_id)`).catch(() => null);
  await prisma.$executeRawUnsafe(`create index if not exists idx_operafix_kam_companies_source_company on operafix_kam_companies(source_company_id)`).catch(() => null);
  await prisma.$executeRawUnsafe(`create unique index if not exists ux_operafix_kam_companies_source_company on operafix_kam_companies(source_company_id) where source_company_id is not null`).catch(() => null);
  await prisma.$executeRawUnsafe(`create index if not exists idx_operafix_kam_companies_score on operafix_kam_companies(score_empresa)`).catch(() => null);
}


async function syncFinanfixPotentialCompanies() {
  try {
    const hasCompanies = await tableExists('companies');
    const hasMandantes = await tableExists('mandantes');
    if (!hasCompanies || !hasMandantes) return 0;

    const companyCols = {
      id: await columnExists('companies', 'id'),
      mandante_id: await columnExists('companies', 'mandante_id'),
      rut: await columnExists('companies', 'rut'),
      razon_social: await columnExists('companies', 'razon_social'),
      owner_name: await columnExists('companies', 'owner_name'),
      email: await columnExists('companies', 'email'),
      estimated_amount: await columnExists('companies', 'estimated_amount'),
    };
    const mandanteCols = {
      id: await columnExists('mandantes', 'id'),
      name: await columnExists('mandantes', 'name'),
    };

    if (!companyCols.id || !companyCols.mandante_id || !companyCols.rut || !companyCols.razon_social || !mandanteCols.id || !mandanteCols.name) return 0;

    const ownerExpr = companyCols.owner_name ? 'c.owner_name' : 'null::text';
    const emailExpr = companyCols.email ? 'c.email' : 'null::text';
    const amountExpr = companyCols.estimated_amount ? 'c.estimated_amount' : 'null::numeric';

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      select c.id as source_company_id, c.mandante_id as source_mandante_id, m.name as source_mandante_name,
             c.rut, c.razon_social, ${ownerExpr} as owner_name, ${emailExpr} as email, ${amountExpr} as estimated_amount
      from companies c
      join mandantes m on m.id = c.mandante_id
      where (${FINANFIX_MANDANTE_PATTERNS.map((_, index) => `m.name ilike $${index + 1}`).join(' or ')})
      order by c.razon_social asc
    `, ...FINANFIX_MANDANTE_PATTERNS).catch((error) => {
      console.error('[KAM] No se pudo sincronizar empresas Finanfix:', error);
      return [] as any[];
    });

    for (const row of rows) {
      const monto = numberOrNull(row.estimated_amount);
      const score = companyScore({ monto_devolucion: monto });
      await prisma.$executeRawUnsafe(`
        insert into operafix_kam_companies (
          id, source_company_id, source_mandante_id, source_mandante_name, rut, razon_social,
          monto_devolucion, nombre_contacto, correo, estado, prioridad, score_empresa, segmento_empresa,
          segmento_monto, tipo_oportunidad, origen
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Sin asignar',$10,$11,$12,$13,'Recuperaciones','Registro empresas - Finanfix Solutions SPA')
        on conflict (source_company_id) where source_company_id is not null do update set
          rut=excluded.rut,
          razon_social=excluded.razon_social,
          monto_devolucion=coalesce(operafix_kam_companies.monto_devolucion, excluded.monto_devolucion),
          nombre_contacto=coalesce(operafix_kam_companies.nombre_contacto, excluded.nombre_contacto),
          correo=coalesce(operafix_kam_companies.correo, excluded.correo),
          source_mandante_id=excluded.source_mandante_id,
          source_mandante_name=excluded.source_mandante_name,
          origen=excluded.origen,
          updated_at=now()
      `,
        id('kco'), String(row.source_company_id), String(row.source_mandante_id), String(row.source_mandante_name || 'Finanfix Solutions SPA'),
        String(row.rut || ''), String(row.razon_social || ''), monto, strOrNull(row.owner_name), strOrNull(row.email),
        priority(score), score, segmentEmployees(null), segmentAmount(monto)
      ).catch((error) => console.error('[KAM] No se pudo insertar empresa potencial:', error));
    }
    return rows.length;
  } catch (error) {
    console.error('[KAM] Error general sincronizando Finanfix:', error);
    return 0;
  }
}


async function getKamProfiles(): Promise<KamProfile[]> {
  const rows = await prisma.$queryRawUnsafe<KamProfile[]>(`
    select p.*, u.full_name, u.email,
      coalesce(c.carga_actual,0)::integer as carga_actual
    from operafix_kam_profiles p
    join operafix_users u on u.id = p.user_id
    left join (
      select kam_asignado_id, count(*)::integer as carga_actual
      from operafix_kam_companies
      where kam_asignado_id is not null and estado not in ('Perdida','Ganada','Congelada')
      group by kam_asignado_id
    ) c on c.kam_asignado_id = p.user_id
    where u.role = 'kam' and coalesce(u.active,true) = true
    order by p.ranking_kam desc, u.full_name asc
  `).catch(() => [] as KamProfile[]);
  return rows;
}

function matchProfile(company: KamCompany, profile: KamProfile) {
  let score = Number(profile.ranking_kam || 0) * 0.25;
  const motivos: string[] = [];
  const rubro = String(company.rubro || "").toLowerCase();
  const region = String(company.region || "").toLowerCase();
  const tipo = String(company.tipo_oportunidad || "").toLowerCase();
  const employees = Number(company.nro_empleados || 0);
  const amount = Number(company.monto_devolucion || 0);

  const rubros = (profile.rubros_experiencia || []).map((x) => String(x).toLowerCase());
  if (rubro && rubros.some((x) => rubro.includes(x) || x.includes(rubro))) {
    score += 20;
    motivos.push(`Experiencia en rubro ${company.rubro}`);
  }

  const regiones = (profile.regiones_experiencia || []).map((x) => String(x).toLowerCase());
  if (region && regiones.some((x) => region.includes(x) || x.includes(region))) {
    score += 10;
    motivos.push(`Experiencia en región ${company.region}`);
  }

  if (tipo.includes("licit")) {
    score += Number(profile.experiencia_licitaciones || 0) * 6;
    motivos.push("Calce con licitaciones");
  }
  if (tipo.includes("venta")) score += Number(profile.experiencia_ventas || 0) * 5;
  if (tipo.includes("recuper")) score += Number(profile.experiencia_recuperaciones || 0) * 5;

  if (employees >= 200 || amount > 5000000) {
    score += Number(profile.experiencia_empresas_grandes || 0) * 6;
    motivos.push("Calce con empresas grandes o alto monto");
  } else if (employees > 0) {
    score += Number(profile.experiencia_empresas_pequenas || 0) * 5;
    motivos.push("Calce con empresas pequeñas/medianas");
  }

  const capacidad = Number(profile.capacidad_maxima || 0);
  const carga = Number(profile.carga_actual || 0);
  if (capacidad > 0) {
    const disponibilidad = Math.max(0, capacidad - carga) / capacidad;
    score += disponibilidad * 10;
    if (disponibilidad > 0.3) motivos.push("Tiene capacidad disponible");
  }

  if (amount > 20000000 && !String(profile.nivel_experiencia || "").toLowerCase().match(/senior|experto/)) {
    score -= 20;
    motivos.push("Penalización: monto estratégico requiere KAM senior o experto");
  }

  return { ...profile, score_match: Math.max(0, Math.min(100, Math.round(score))), motivos };
}

async function fetchCompany(companyId: string) {
  const rows = await prisma.$queryRawUnsafe<KamCompany[]>(`select * from operafix_kam_companies where id = $1 limit 1`, companyId);
  return rows[0] || null;
}

function companyPayload(body: any) {
  const nroEmpleados = integerOrNull(body.nro_empleados ?? body.nroEmpleados);
  const montoDevolucion = numberOrNull(body.monto_devolucion ?? body.montoDevolucion);
  const score = companyScore({
    nro_empleados: nroEmpleados,
    monto_devolucion: montoDevolucion,
    rubro: strOrNull(body.rubro),
    region: strOrNull(body.region),
    tipo_oportunidad: strOrNull(body.tipo_oportunidad),
  });
  return {
    rut: String(body.rut || "").trim(),
    razon_social: String(body.razon_social || body.razonSocial || "").trim(),
    nro_empleados: nroEmpleados,
    monto_devolucion: montoDevolucion,
    nombre_contacto: strOrNull(body.nombre_contacto ?? body.nombre),
    cargo_contacto: strOrNull(body.cargo_contacto ?? body.cargo),
    correo: strOrNull(body.correo),
    telefono: strOrNull(body.telefono ?? body.nro_telefonico),
    estado: strOrNull(body.estado) || "Sin asignar",
    observacion: strOrNull(body.observacion),
    rubro: strOrNull(body.rubro),
    region: strOrNull(body.region),
    prioridad: priority(score),
    score_empresa: score,
    segmento_empresa: segmentEmployees(nroEmpleados),
    segmento_monto: segmentAmount(montoDevolucion),
    tipo_oportunidad: strOrNull(body.tipo_oportunidad) || "Recuperaciones",
    origen: strOrNull(body.origen) || "Carga manual",
    canal_origen: strOrNull(body.canal_origen),
    probabilidad_cierre: integerOrNull(body.probabilidad_cierre),
    proxima_gestion: strOrNull(body.proxima_gestion),
    resultado_gestion: strOrNull(body.resultado_gestion),
    motivo_perdida: strOrNull(body.motivo_perdida),
  };
}

kamRouter.use(async (_req, res, next) => {
  try {
    await ensureKamTables();
    next();
  } catch (error: any) {
    console.error('[KAM] Error preparando tablas KAM:', error);
    res.status(500).json({
      message: 'No se pudo preparar el módulo KAM en la base de datos.',
      detail: process.env.NODE_ENV === 'production' ? undefined : String(error?.message || error),
    });
  }
});

kamRouter.get("/companies", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  try {
    await syncFinanfixPotentialCompanies();

    const userId = sessionUserId(session);
    const search = String(req.query.search || "").trim();
    const where: string[] = [];
    const params: any[] = [];

    if (isKam(session)) {
      params.push(userId);
      where.push(`c.kam_asignado_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(c.rut ilike $${params.length} or c.razon_social ilike $${params.length} or coalesce(c.rubro,'') ilike $${params.length} or coalesce(c.region,'') ilike $${params.length})`);
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      select c.*, ka.full_name as kam_asignado_nombre, kad.full_name as kam_admin_nombre
      from operafix_kam_companies c
      left join operafix_users ka on ka.id = c.kam_asignado_id
      left join operafix_users kad on kad.id = c.kam_admin_id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by c.score_empresa desc, c.created_at desc
    `, ...params);

    res.json(rows);
  } catch (error: any) {
    console.error('[KAM] Error listando empresas:', error);
    res.status(500).json({ message: 'No se pudieron cargar las empresas KAM.', detail: process.env.NODE_ENV === 'production' ? undefined : String(error?.message || error) });
  }
});

kamRouter.post("/companies", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  if (isKam(session)) return res.status(403).json({ message: "El KAM vendedor no puede crear empresas; solo gestionar su cartera asignada." });

  const data = companyPayload(req.body);
  if (!data.rut || !data.razon_social) return res.status(400).json({ message: "RUT y Razón Social son obligatorios." });

  const companyId = id("kco");
  const kamAdminId = isKamAdmin(session) ? sessionUserId(session) : strOrNull(req.body.kam_admin_id);

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    insert into operafix_kam_companies (
      id, rut, razon_social, nro_empleados, monto_devolucion, nombre_contacto, cargo_contacto, correo, telefono,
      estado, observacion, rubro, region, prioridad, score_empresa, segmento_empresa, segmento_monto,
      tipo_oportunidad, origen, kam_admin_id, proxima_gestion, resultado_gestion, motivo_perdida, probabilidad_cierre, canal_origen
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    returning *
  `,
    companyId, data.rut, data.razon_social, data.nro_empleados, data.monto_devolucion, data.nombre_contacto,
    data.cargo_contacto, data.correo, data.telefono, data.estado, data.observacion, data.rubro, data.region,
    data.prioridad, data.score_empresa, data.segmento_empresa, data.segmento_monto, data.tipo_oportunidad,
    data.origen, kamAdminId, data.proxima_gestion, data.resultado_gestion, data.motivo_perdida, data.probabilidad_cierre, data.canal_origen
  );
  res.status(201).json(rows[0]);
});

kamRouter.put("/companies/:id", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  try {
    const existing = await fetchCompany(req.params.id);
    if (!existing) return res.status(404).json({ message: "Empresa KAM no encontrada." });
    if (isKam(session) && existing.kam_asignado_id !== sessionUserId(session)) return res.status(403).json({ message: "Solo puedes modificar empresas de tu cartera." });

    const data = companyPayload({ ...existing, ...req.body });
    if (String(data.estado || '') === 'Perdida' && !data.motivo_perdida) {
      return res.status(400).json({ message: 'Debes ingresar motivo de pérdida antes de marcar la empresa como Perdida.' });
    }

    // En cambios rápidos desde Kanban, el frontend puede enviar solo el nuevo estado.
    // Para no bloquear el arrastre, si la empresa queda activa y asignada sin próxima gestión,
    // se agenda automáticamente para el día siguiente.
    if (existing.kam_asignado_id && !['Ganada','Perdida','Congelada'].includes(String(data.estado || '')) && !data.proxima_gestion) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      data.proxima_gestion = tomorrow.toISOString().slice(0, 10);
    }
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      update operafix_kam_companies set
        rut=$2, razon_social=$3, nro_empleados=$4, monto_devolucion=$5, nombre_contacto=$6, cargo_contacto=$7,
        correo=$8, telefono=$9, estado=$10, observacion=$11, rubro=$12, region=$13, prioridad=$14,
        score_empresa=$15, segmento_empresa=$16, segmento_monto=$17, tipo_oportunidad=$18, origen=$19,
        proxima_gestion=$20, resultado_gestion=$21, motivo_perdida=$22, probabilidad_cierre=$23, canal_origen=$24,
        fecha_ultimo_contacto=case when $25::boolean then now() else fecha_ultimo_contacto end,
        updated_at=now()
      where id=$1 returning *
    `,
      req.params.id, data.rut, data.razon_social, data.nro_empleados, data.monto_devolucion, data.nombre_contacto,
      data.cargo_contacto, data.correo, data.telefono, data.estado, data.observacion, data.rubro, data.region,
      data.prioridad, data.score_empresa, data.segmento_empresa, data.segmento_monto, data.tipo_oportunidad,
      data.origen, data.proxima_gestion, data.resultado_gestion, data.motivo_perdida, data.probabilidad_cierre, data.canal_origen,
      ["Contactada", "Interesada", "Propuesta enviada", "En negociación", "Ganada", "Perdida"].includes(String(data.estado || ""))
    );

    const updated = rows[0];
    if (!updated) return res.status(404).json({ message: "Empresa KAM no encontrada." });

    const estadoCambio = String(existing.estado || '') !== String(data.estado || '');
    const obsCambio = String(existing.observacion || '') !== String(data.observacion || '');
    const proximaCambio = String(existing.proxima_gestion || '').slice(0, 10) !== String(data.proxima_gestion || '').slice(0, 10);
    if (estadoCambio || obsCambio || proximaCambio || strOrNull(req.body.actividad_tipo) || strOrNull(req.body.actividad_observacion)) {
      await prisma.$executeRawUnsafe(`
        insert into operafix_kam_activities (id, company_id, kam_id, tipo_gestion, resultado, proxima_accion, proxima_gestion, estado_venta, probabilidad_cierre, observacion)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
        id('kac'), req.params.id, isKam(session) ? sessionUserId(session) : (updated?.kam_asignado_id || sessionUserId(session)),
        strOrNull(req.body.actividad_tipo) || (estadoCambio ? 'Cambio de estado' : 'Actualización de seguimiento'),
        data.resultado_gestion, strOrNull(req.body.proxima_accion), data.proxima_gestion, data.estado, data.probabilidad_cierre,
        strOrNull(req.body.actividad_observacion) || data.observacion || `Estado: ${data.estado}`
      ).catch((error) => console.error('[KAM] No se pudo registrar actividad:', error));
    }
    res.json(updated);
  } catch (error: any) {
    console.error('[KAM] Error actualizando empresa:', error);
    res.status(500).json({
      message: 'No se pudo actualizar la empresa KAM.',
      detail: process.env.NODE_ENV === 'production' ? undefined : String(error?.message || error),
    });
  }
});

kamRouter.delete("/companies/:id", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  if (isKam(session)) return res.status(403).json({ message: "El KAM vendedor no puede eliminar empresas." });
  await prisma.$executeRawUnsafe(`delete from operafix_kam_companies where id = $1`, req.params.id);
  res.json({ ok: true });
});


kamRouter.get("/users", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  if (!isAdmin(session) && !isKamAdmin(session) && !String(session.role || "").toLowerCase().includes("interno")) {
    return res.status(403).json({ message: "Solo admin o KAM administrador puede listar vendedores KAM." });
  }
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    select id, email, full_name, role, active
    from operafix_users
    where role = 'kam' and coalesce(active,true) = true
    order by full_name asc, email asc
  `).catch(() => [] as any[]);
  res.json(rows);
});

kamRouter.get("/metrics", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  try {
    await syncFinanfixPotentialCompanies();
    const userId = sessionUserId(session);
    const where = isKam(session) ? `where c.kam_asignado_id = $1` : "";
    const params = isKam(session) ? [userId] : [];
    const summary = await prisma.$queryRawUnsafe<any[]>(`
      select
        count(*)::integer as total_empresas,
        count(*) filter (where c.kam_asignado_id is null)::integer as sin_asignar,
        count(*) filter (where c.estado = 'Ganada')::integer as ganadas,
        count(*) filter (where c.estado = 'Perdida')::integer as perdidas,
        count(*) filter (where c.estado in ('En prospección','Contactada','Interesada','Propuesta enviada','En negociación'))::integer as en_gestion,
        coalesce(sum(c.monto_devolucion),0)::numeric as monto_potencial,
        coalesce(sum(c.monto_devolucion) filter (where c.estado = 'Ganada'),0)::numeric as monto_ganado
      from operafix_kam_companies c
      ${where}
    `, ...params).catch(() => [] as any[]);

    const byKam = await prisma.$queryRawUnsafe<any[]>(`
      select coalesce(u.full_name,u.email,'Sin asignar') as kam,
        c.kam_asignado_id,
        count(*)::integer as total,
        count(*) filter (where c.estado = 'Ganada')::integer as ganadas,
        count(*) filter (where c.estado = 'Perdida')::integer as perdidas,
        count(*) filter (where c.estado in ('En prospección','Contactada','Interesada','Propuesta enviada','En negociación'))::integer as en_gestion,
        coalesce(avg(nullif(c.probabilidad_cierre,0)),0)::numeric(10,2) as probabilidad_promedio,
        coalesce(sum(c.monto_devolucion),0)::numeric as monto_potencial,
        coalesce(sum(c.monto_devolucion) filter (where c.estado = 'Ganada'),0)::numeric as monto_ganado,
        max(c.fecha_ultimo_contacto) as ultimo_contacto
      from operafix_kam_companies c
      left join operafix_users u on u.id = c.kam_asignado_id
      ${where}
      group by c.kam_asignado_id, coalesce(u.full_name,u.email,'Sin asignar')
      order by ganadas desc, monto_ganado desc, total desc
    `, ...params).catch(() => [] as any[]);

    res.json({ summary: summary[0] || {}, byKam });
  } catch (error: any) {
    console.error('[KAM] Error cargando métricas:', error);
    res.status(500).json({ message: 'No se pudieron cargar las métricas KAM.', detail: process.env.NODE_ENV === 'production' ? undefined : String(error?.message || error) });
  }
});

kamRouter.get("/profiles", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  res.json(await getKamProfiles());
});

kamRouter.post("/profiles", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  if (!isAdmin(session) && !isKamAdmin(session)) return res.status(403).json({ message: "Solo admin o KAM administrador puede configurar perfiles." });

  const userId = String(req.body.user_id || "").trim();
  if (!userId) return res.status(400).json({ message: "Debes seleccionar un KAM." });

  const payload = {
    nivel_experiencia: strOrNull(req.body.nivel_experiencia) || "Junior",
    experiencia_licitaciones: integerOrNull(req.body.experiencia_licitaciones) || 0,
    experiencia_ventas: integerOrNull(req.body.experiencia_ventas) || 0,
    experiencia_recuperaciones: integerOrNull(req.body.experiencia_recuperaciones) || 0,
    experiencia_empresas_grandes: integerOrNull(req.body.experiencia_empresas_grandes) || 0,
    experiencia_empresas_pequenas: integerOrNull(req.body.experiencia_empresas_pequenas) || 0,
    rubros_experiencia: toArray(req.body.rubros_experiencia),
    regiones_experiencia: toArray(req.body.regiones_experiencia),
    capacidad_maxima: integerOrNull(req.body.capacidad_maxima) || 30,
    tasa_cierre: numberOrNull(req.body.tasa_cierre) || 0,
    monto_cerrado_historico: numberOrNull(req.body.monto_cerrado_historico) || 0,
    activo: req.body.activo === undefined ? true : Boolean(req.body.activo),
  };
  const ranking = profileRanking(payload);

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    insert into operafix_kam_profiles (
      id, user_id, nivel_experiencia, experiencia_licitaciones, experiencia_ventas, experiencia_recuperaciones,
      experiencia_empresas_grandes, experiencia_empresas_pequenas, rubros_experiencia, regiones_experiencia,
      capacidad_maxima, tasa_cierre, monto_cerrado_historico, ranking_kam, activo
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::text[],$10::text[],$11,$12,$13,$14,$15)
    on conflict (user_id) do update set
      nivel_experiencia=excluded.nivel_experiencia,
      experiencia_licitaciones=excluded.experiencia_licitaciones,
      experiencia_ventas=excluded.experiencia_ventas,
      experiencia_recuperaciones=excluded.experiencia_recuperaciones,
      experiencia_empresas_grandes=excluded.experiencia_empresas_grandes,
      experiencia_empresas_pequenas=excluded.experiencia_empresas_pequenas,
      rubros_experiencia=excluded.rubros_experiencia,
      regiones_experiencia=excluded.regiones_experiencia,
      capacidad_maxima=excluded.capacidad_maxima,
      tasa_cierre=excluded.tasa_cierre,
      monto_cerrado_historico=excluded.monto_cerrado_historico,
      ranking_kam=excluded.ranking_kam,
      activo=excluded.activo,
      updated_at=now()
    returning *
  `, id("kpf"), userId, payload.nivel_experiencia, payload.experiencia_licitaciones, payload.experiencia_ventas, payload.experiencia_recuperaciones, payload.experiencia_empresas_grandes, payload.experiencia_empresas_pequenas, payload.rubros_experiencia, payload.regiones_experiencia, payload.capacidad_maxima, payload.tasa_cierre, payload.monto_cerrado_historico, ranking, payload.activo);
  res.json(rows[0]);
});

kamRouter.get("/recommend/:companyId", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  const company = await fetchCompany(req.params.companyId);
  if (!company) return res.status(404).json({ message: "Empresa KAM no encontrada." });
  const profiles = (await getKamProfiles()).filter((p) => p.activo);
  const recommendations = profiles.map((profile) => matchProfile(company, profile)).sort((a, b) => (b.score_match || 0) - (a.score_match || 0));
  res.json({ company, recommendations, best: recommendations[0] || null });
});

kamRouter.post("/companies/:id/assign", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  if (isKam(session)) return res.status(403).json({ message: "El KAM vendedor no puede reasignar empresas." });
  const company = await fetchCompany(req.params.id);
  if (!company) return res.status(404).json({ message: "Empresa KAM no encontrada." });
  const kamId = String(req.body.kam_asignado_id || req.body.kam_id || "").trim();
  if (!kamId) return res.status(400).json({ message: "Debes seleccionar el KAM asignado." });
  const targetRows = await prisma.$queryRawUnsafe<any[]>(`select id, role, active from operafix_users where id=$1 limit 1`, kamId).catch(() => [] as any[]);
  if (!targetRows[0] || String(targetRows[0].role || "").toLowerCase() !== "kam" || targetRows[0].active === false) {
    return res.status(400).json({ message: "Solo puedes asignar empresas a usuarios con rol KAM activo." });
  }
  const scoreMatch = integerOrNull(req.body.score_match) || null;
  const adminId = isKamAdmin(session) ? sessionUserId(session) : strOrNull(req.body.kam_admin_id) || sessionUserId(session);

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    update operafix_kam_companies
    set kam_asignado_id=$2, kam_admin_id=$3, estado='Asignada', fecha_asignacion=now(), updated_at=now()
    where id=$1 returning *
  `, req.params.id, kamId, adminId);

  await prisma.$executeRawUnsafe(`
    insert into operafix_kam_assignment_history (id, empresa_id, kam_anterior_id, kam_nuevo_id, kam_admin_id, motivo_asignacion, score_match, observacion)
    values ($1,$2,$3,$4,$5,$6,$7,$8)
  `, id("kah"), req.params.id, company.kam_asignado_id || null, kamId, adminId, strOrNull(req.body.motivo_asignacion) || "Asignación manual desde módulo KAM", scoreMatch, strOrNull(req.body.observacion));

  res.json(rows[0]);
});

kamRouter.get("/rules", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`select * from operafix_kam_assignment_rules order by activa desc, created_at desc`);
    res.json(rows);
  } catch (error: any) {
    console.error('[KAM] Error listando reglas:', error);
    res.status(500).json({ message: 'No se pudieron cargar las reglas KAM.', detail: process.env.NODE_ENV === 'production' ? undefined : String(error?.message || error) });
  }
});

kamRouter.post("/rules", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  if (!isAdmin(session) && !isKamAdmin(session)) return res.status(403).json({ message: "Solo admin o KAM administrador puede crear reglas." });
  const ruleId = id("kar");
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    insert into operafix_kam_assignment_rules (id,nombre_regla,criterio,operador,valor,peso,accion,activa)
    values ($1,$2,$3,$4,$5,$6,$7,$8) returning *
  `, ruleId, String(req.body.nombre_regla || "Nueva regla"), String(req.body.criterio || "monto_devolucion"), String(req.body.operador || ">"), strOrNull(req.body.valor), integerOrNull(req.body.peso) || 10, String(req.body.accion || "priorizar"), req.body.activa === undefined ? true : Boolean(req.body.activa));
  res.status(201).json(rows[0]);
});

kamRouter.get("/companies/:id/activities", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  const company = await fetchCompany(req.params.id);
  if (!company) return res.status(404).json({ message: "Empresa KAM no encontrada." });
  if (isKam(session) && company.kam_asignado_id !== sessionUserId(session)) return res.status(403).json({ message: "Solo puedes ver gestiones de tu cartera." });
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    select a.*, coalesce(u.full_name,u.email) as kam_nombre
    from operafix_kam_activities a
    left join operafix_users u on u.id = a.kam_id
    where a.company_id = $1
    order by a.created_at desc
  `, req.params.id).catch(() => [] as any[]);
  res.json(rows);
});

kamRouter.post("/companies/:id/activities", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  const company = await fetchCompany(req.params.id);
  if (!company) return res.status(404).json({ message: "Empresa KAM no encontrada." });
  if (isKam(session) && company.kam_asignado_id !== sessionUserId(session)) return res.status(403).json({ message: "Solo puedes registrar gestiones de tu cartera." });

  const tipo = strOrNull(req.body.tipo_gestion) || 'Seguimiento';
  const estadoVenta = strOrNull(req.body.estado_venta) || strOrNull(req.body.estado) || company.estado || 'Asignada';
  const motivoPerdida = strOrNull(req.body.motivo_perdida);
  if (estadoVenta === 'Perdida' && !motivoPerdida && !strOrNull(req.body.observacion)) {
    return res.status(400).json({ message: 'Para registrar una pérdida debes indicar motivo u observación.' });
  }
  const proxima = strOrNull(req.body.proxima_gestion);
  const prob = integerOrNull(req.body.probabilidad_cierre);
  const resultado = strOrNull(req.body.resultado);
  const observacion = strOrNull(req.body.observacion);
  const proximaAccion = strOrNull(req.body.proxima_accion);
  const kamId = isKam(session) ? sessionUserId(session) : (company.kam_asignado_id || sessionUserId(session));

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    insert into operafix_kam_activities (id, company_id, kam_id, tipo_gestion, resultado, proxima_accion, proxima_gestion, estado_venta, probabilidad_cierre, observacion)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    returning *
  `, id('kac'), req.params.id, kamId, tipo, resultado, proximaAccion, proxima, estadoVenta, prob, observacion);

  await prisma.$executeRawUnsafe(`
    update operafix_kam_companies set
      estado=$2,
      resultado_gestion=coalesce($3, resultado_gestion),
      proxima_gestion=coalesce($4::date, proxima_gestion),
      probabilidad_cierre=coalesce($5, probabilidad_cierre),
      motivo_perdida=coalesce($6, motivo_perdida),
      observacion=coalesce($7, observacion),
      fecha_ultimo_contacto=now(),
      updated_at=now()
    where id=$1
  `, req.params.id, estadoVenta, resultado, proxima, prob, motivoPerdida, observacion).catch((error) => console.error('[KAM] No se pudo actualizar empresa desde actividad:', error));

  res.status(201).json(rows[0]);
});

kamRouter.get("/history/:companyId", async (req, res) => {
  const session = requireKamAccess(req, res);
  if (!session) return;
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    select h.*, old.full_name as kam_anterior_nombre, new.full_name as kam_nuevo_nombre, adm.full_name as kam_admin_nombre
    from operafix_kam_assignment_history h
    left join operafix_users old on old.id = h.kam_anterior_id
    left join operafix_users new on new.id = h.kam_nuevo_id
    left join operafix_users adm on adm.id = h.kam_admin_id
    where h.empresa_id=$1
    order by h.created_at desc
  `, req.params.companyId);
  res.json(rows);
});

export default kamRouter;
