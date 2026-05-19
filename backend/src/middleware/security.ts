import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

type Role = "admin" | "interno" | "kam" | "cliente";

export interface OperafixSession {
  id: string;
  email: string;
  role: Role | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  assigned_mandante_ids?: string[];
  assigned_mandante_names?: string[];
  full_name?: string | null;
}

export interface SecureRequest extends Request {
  user?: OperafixSession;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).map((x) => x.trim()).filter(Boolean);
    } catch {}
    return raw.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

export function parseSession(req: Request): OperafixSession | null {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as any;
    const assignedIds = parseArray(payload.assigned_mandante_ids);
    const assignedNames = parseArray(payload.assigned_mandante_names);
    return {
      id: String(payload.sub || payload.id || ""),
      email: String(payload.email || ""),
      role: String(payload.role || "cliente").toLowerCase(),
      mandante_id: payload.mandante_id || null,
      mandante_name: payload.mandante_name || null,
      assigned_mandante_ids: assignedIds,
      assigned_mandante_names: assignedNames,
      full_name: payload.full_name || payload.email || null,
    };
  } catch {
    return null;
  }
}

export function requireAuth(req: SecureRequest, res: Response, next: NextFunction) {
  const session = parseSession(req);
  if (!session) return res.status(401).json({ message: "Debes iniciar sesión." });
  req.user = session;
  next();
}

export function requireRoles(roles: Role[]) {
  return (req: SecureRequest, res: Response, next: NextFunction) => {
    const session = req.user || parseSession(req);
    if (!session) return res.status(401).json({ message: "Debes iniciar sesión." });
    req.user = session;
    if (!roles.includes(String(session.role).toLowerCase() as Role)) {
      return res.status(403).json({ message: "No tienes permisos para este módulo." });
    }
    next();
  };
}

export function isAdmin(session?: OperafixSession | null) {
  return String(session?.role || "").toLowerCase() === "admin";
}

export function isInternal(session?: OperafixSession | null) {
  return ["admin", "interno", "kam"].includes(String(session?.role || "").toLowerCase());
}

export function assignedMandanteIds(session?: OperafixSession | null) {
  const ids = [...(session?.assigned_mandante_ids || [])];
  if (session?.mandante_id) ids.push(String(session.mandante_id));
  return Array.from(new Set(ids.filter(Boolean)));
}

export function assignedMandanteNames(session?: OperafixSession | null) {
  const names = [...(session?.assigned_mandante_names || [])];
  if (session?.mandante_name) names.push(String(session.mandante_name));
  return Array.from(new Set(names.filter(Boolean)));
}

export function hasMandanteRestriction(session?: OperafixSession | null) {
  const role = String(session?.role || "").toLowerCase();
  if (role === "admin") return false;
  if (role === "cliente") return true;
  if (["interno", "kam"].includes(role)) {
    return assignedMandanteIds(session).length > 0 || assignedMandanteNames(session).length > 0;
  }
  return true;
}

export function sessionCanUseMandante(
  session: OperafixSession | null | undefined,
  mandanteId?: unknown,
  mandanteName?: unknown
) {
  if (!session) return false;
  if (isAdmin(session)) return true;
  if (!hasMandanteRestriction(session)) return true;

  const id = String(mandanteId || "").trim();
  const name = normalizeText(mandanteName);
  const allowedIds = assignedMandanteIds(session).map(String);
  const allowedNames = assignedMandanteNames(session).map(normalizeText);

  if (id && allowedIds.includes(id)) return true;
  if (name && allowedNames.some((allowed) => allowed && (allowed === name || name.includes(allowed) || allowed.includes(name)))) return true;
  return false;
}

export function recordMatchesSession(record: any, session?: OperafixSession | null) {
  if (!session) return false;
  if (isAdmin(session)) return true;
  if (!hasMandanteRestriction(session)) return true;

  const recordMandanteId =
    record?.mandante_id ||
    record?.mandanteId ||
    record?.mandante?.id ||
    record?.mandante_rel?.id ||
    null;

  const recordMandanteName =
    record?.mandante_name ||
    record?.mandante?.name ||
    record?.mandante_rel?.name ||
    record?.mandante ||
    record?.client_name ||
    null;

  return sessionCanUseMandante(session, recordMandanteId, recordMandanteName);
}

export function tenantWhere(session?: OperafixSession | null) {
  if (!session || isAdmin(session) || !hasMandanteRestriction(session)) return {};

  const ids = assignedMandanteIds(session);
  const names = assignedMandanteNames(session);
  const OR: any[] = [];

  if (ids.length) OR.push({ mandante_id: { in: ids } });
  if (names.length) OR.push(...names.map((name) => ({ mandante: name })));

  return OR.length ? { OR } : { id: "__NO_ACCESS__" };
}

export async function ensureAuditTable() {
  await prisma.$executeRawUnsafe(`
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
    )
  `);
}

export async function audit(req: SecureRequest, action: string, module: string, detail?: string, recordId?: string | null) {
  try {
    await ensureAuditTable();
    const session = req.user || parseSession(req);
    await prisma.$executeRawUnsafe(
      `insert into operafix_audit_logs (id, user_id, user_email, user_role, mandante_id, mandante_name, action, module, record_id, detail, ip, user_agent)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      session?.id || null,
      session?.email || null,
      session?.role || null,
      session?.mandante_id || null,
      session?.mandante_name || null,
      action,
      module,
      recordId || null,
      detail || null,
      req.ip || null,
      req.headers["user-agent"] || null
    );
  } catch (error) {
    console.warn("Audit log skipped:", error);
  }
}
