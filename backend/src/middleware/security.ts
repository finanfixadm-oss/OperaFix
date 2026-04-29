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
  full_name?: string | null;
}

export interface SecureRequest extends Request {
  user?: OperafixSession;
}

export function parseSession(req: Request): OperafixSession | null {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as any;
    return {
      id: String(payload.sub || payload.id || ""),
      email: String(payload.email || ""),
      role: String(payload.role || "cliente").toLowerCase(),
      mandante_id: payload.mandante_id || null,
      mandante_name: payload.mandante_name || null,
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

export function isInternal(session?: OperafixSession | null) {
  return ["admin", "interno", "kam"].includes(String(session?.role || "").toLowerCase());
}

export function tenantWhere(session?: OperafixSession | null) {
  if (!session || isInternal(session)) return {};
  if (session.mandante_id) {
    return { OR: [{ mandante_id: session.mandante_id }, { mandante: session.mandante_name || "" }] };
  }
  if (session.mandante_name) return { mandante: session.mandante_name };
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
