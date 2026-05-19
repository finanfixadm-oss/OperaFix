import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

type Role = "admin" | "interno" | "kam" | "cliente";

export type AssignedMandante = {
  id: string;
  name: string;
};

export interface OperafixSession {
  id: string;
  email: string;
  role: Role | string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  assigned_mandantes?: AssignedMandante[];
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function parseSession(req: Request): OperafixSession | null {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as any;
    const assigned_mandantes = Array.isArray(payload.assigned_mandantes)
      ? payload.assigned_mandantes.map((item: any) => ({
          id: String(item.id || item.mandante_id || ""),
          name: String(item.name || item.mandante_name || ""),
        })).filter((item: AssignedMandante) => item.id || item.name)
      : [];

    const assigned_mandante_ids = asStringArray(payload.assigned_mandante_ids);
    const assigned_mandante_names = asStringArray(payload.assigned_mandante_names);

    return {
      id: String(payload.sub || payload.id || ""),
      email: String(payload.email || ""),
      role: String(payload.role || "cliente").toLowerCase(),
      mandante_id: payload.mandante_id || null,
      mandante_name: payload.mandante_name || null,
      assigned_mandantes,
      assigned_mandante_ids: assigned_mandante_ids.length
        ? assigned_mandante_ids
        : assigned_mandantes.map((item: AssignedMandante) => item.id).filter(Boolean),
      assigned_mandante_names: assigned_mandante_names.length
        ? assigned_mandante_names
        : assigned_mandantes.map((item: AssignedMandante) => item.name).filter(Boolean),
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
  if (!session) return [] as string[];
  const ids = new Set<string>();
  for (const id of session.assigned_mandante_ids || []) {
    if (id) ids.add(String(id));
  }
  for (const item of session.assigned_mandantes || []) {
    if (item.id) ids.add(String(item.id));
  }
  if (session.mandante_id) ids.add(String(session.mandante_id));
  return [...ids];
}

export function assignedMandanteNames(session?: OperafixSession | null) {
  if (!session) return [] as string[];
  const names = new Set<string>();
  for (const name of session.assigned_mandante_names || []) {
    if (name) names.add(String(name));
  }
  for (const item of session.assigned_mandantes || []) {
    if (item.name) names.add(String(item.name));
  }
  if (session.mandante_name) names.add(String(session.mandante_name));
  return [...names];
}

export function hasAssignedMandanteScope(session?: OperafixSession | null) {
  if (!session) return true;
  if (isAdmin(session)) return false;
  return ["interno", "kam", "cliente"].includes(String(session.role || "").toLowerCase());
}

export function rowMandanteAllowed(row: any, session?: OperafixSession | null) {
  if (!hasAssignedMandanteScope(session)) return true;

  const ids = assignedMandanteIds(session);
  const names = assignedMandanteNames(session).map(normalizeText);

  if (!ids.length && !names.length) return false;

  const rowIds = [
    row?.mandante_id,
    row?.mandanteId,
    row?.mandante?.id,
    row?.mandante_rel?.id,
  ].filter(Boolean).map(String);

  if (ids.length && rowIds.some((id) => ids.includes(id))) return true;

  const rowNames = [
    row?.mandante,
    row?.mandante_name,
    row?.mandante?.name,
    row?.mandante_rel?.name,
    row?.client_name,
  ].filter(Boolean).map(normalizeText);

  if (names.length && rowNames.some((name) => names.includes(name) || names.some((target) => name.includes(target) || target.includes(name)))) return true;

  return false;
}

export function filterRowsBySession<T extends any>(rows: T[], reqOrSession?: SecureRequest | OperafixSession | null): T[] {
  const session = reqOrSession && "headers" in (reqOrSession as any)
    ? ((reqOrSession as SecureRequest).user || parseSession(reqOrSession as Request))
    : (reqOrSession as OperafixSession | null | undefined);

  if (!hasAssignedMandanteScope(session)) return rows;
  return rows.filter((row: any) => rowMandanteAllowed(row, session));
}

export function ensureMandanteAccess(req: SecureRequest, rowOrMandante: any, res: Response) {
  const session = req.user || parseSession(req);
  if (rowMandanteAllowed(rowOrMandante, session)) return true;
  res.status(403).json({ message: "No tienes acceso al mandante de este registro." });
  return false;
}

export function tenantWhere(session?: OperafixSession | null) {
  if (!session || isAdmin(session)) return {};

  const ids = assignedMandanteIds(session);
  const names = assignedMandanteNames(session);

  if (ids.length || names.length) {
    return {
      OR: [
        ...(ids.length ? [{ mandante_id: { in: ids } }] : []),
        ...(names.length ? [{ mandante: { in: names } }] : []),
      ],
    };
  }

  return { id: "__NO_ACCESS__" };
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
      `
      insert into operafix_audit_logs
      (id, user_id, user_email, user_role, mandante_id, mandante_name, action, module, record_id, detail, ip, user_agent)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `,
      `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    console.warn("No se pudo registrar auditoría:", error);
  }
}
