import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ensureUsersTable, normalizeRole } from "./auth.js";

const usersRouter = Router();

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try { return jwt.verify(token, env.jwtSecret) as any; } catch { return null; }
}

function requireAdmin(req: any, res: any) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ message: "Debes iniciar sesión." });
    return null;
  }
  if (!["admin", "interno"].includes(String(session.role || "").toLowerCase())) {
    res.status(403).json({ message: "No tienes permisos para administrar usuarios." });
    return null;
  }
  return session;
}

usersRouter.get("/", async (req, res) => {
  await ensureUsersTable();
  const session = requireAdmin(req, res);
  if (!session) return;
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `select id, email, full_name, role, mandante_id, mandante_name, active, created_at, updated_at
     from operafix_users
     order by created_at desc`
  );
  res.json(rows);
});

usersRouter.post("/", async (req, res) => {
  try {
    await ensureUsersTable();
    const session = requireAdmin(req, res);
    if (!session) return;
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const fullName = String(req.body.full_name || req.body.name || email).trim();
    const role = normalizeRole(req.body.role);
    const mandanteId = req.body.mandante_id ? String(req.body.mandante_id) : null;
    let mandanteName = req.body.mandante_name ? String(req.body.mandante_name) : null;
    if (mandanteId && !mandanteName) {
      const m = await prisma.mandante.findUnique({ where: { id: mandanteId } }).catch(() => null);
      mandanteName = m?.name || null;
    }
    if (!email || !password) return res.status(400).json({ message: "Correo y contraseña son obligatorios." });
    if (role === "cliente" && !mandanteName && !mandanteId) return res.status(400).json({ message: "Un usuario cliente debe estar asociado a un mandante." });
    const hash = await bcrypt.hash(password, 10);
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `insert into operafix_users (id, email, password_hash, full_name, role, mandante_id, mandante_name, active)
       values ($1, $2, $3, $4, $5, $6, $7, true)
       returning id, email, full_name, role, mandante_id, mandante_name, active, created_at, updated_at`,
      `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      hash,
      fullName,
      role,
      mandanteId,
      mandanteName
    );
    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "No se pudo crear el usuario.", detail: error?.message });
  }
});

usersRouter.put("/:id", async (req, res) => {
  try {
    await ensureUsersTable();
    const session = requireAdmin(req, res);
    if (!session) return;
    const role = req.body.role !== undefined ? normalizeRole(req.body.role) : undefined;
    const mandanteId = req.body.mandante_id !== undefined ? (req.body.mandante_id ? String(req.body.mandante_id) : null) : undefined;
    let mandanteName = req.body.mandante_name !== undefined ? (req.body.mandante_name ? String(req.body.mandante_name) : null) : undefined;
    if (mandanteId && mandanteName === undefined) {
      const m = await prisma.mandante.findUnique({ where: { id: mandanteId } }).catch(() => null);
      mandanteName = m?.name || null;
    }
    const currentRows = await prisma.$queryRawUnsafe<any[]>(`select * from operafix_users where id = $1 limit 1`, req.params.id);
    const current = currentRows[0];
    if (!current) return res.status(404).json({ message: "Usuario no encontrado." });
    const passwordHash = req.body.password ? await bcrypt.hash(String(req.body.password), 10) : current.password_hash;
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `update operafix_users set
        email = $2,
        password_hash = $3,
        full_name = $4,
        role = $5,
        mandante_id = $6,
        mandante_name = $7,
        active = $8,
        updated_at = now()
       where id = $1
       returning id, email, full_name, role, mandante_id, mandante_name, active, created_at, updated_at`,
      req.params.id,
      req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : current.email,
      passwordHash,
      req.body.full_name !== undefined ? String(req.body.full_name) : current.full_name,
      role !== undefined ? role : current.role,
      mandanteId !== undefined ? mandanteId : current.mandante_id,
      mandanteName !== undefined ? mandanteName : current.mandante_name,
      req.body.active !== undefined ? Boolean(req.body.active) : current.active
    );
    res.json(rows[0]);
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "No se pudo actualizar el usuario.", detail: error?.message });
  }
});

usersRouter.delete("/:id", async (req, res) => {
  await ensureUsersTable();
  const session = requireAdmin(req, res);
  if (!session) return;
  await prisma.$executeRawUnsafe(`update operafix_users set active = false, updated_at = now() where id = $1`, req.params.id);
  res.json({ ok: true });
});

export default usersRouter;
