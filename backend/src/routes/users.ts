import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ensureUsersTable, normalizeRole, parseArray, stringifyArray } from "./auth.js";

const usersRouter = Router();

const DEFAULT_PASSWORD = "OperaFix2026!";

type UserRow = {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  assigned_mandante_ids?: string | string[] | null;
  assigned_mandante_names?: string | string[] | null;
  active?: boolean;
  created_at?: Date;
  updated_at?: Date;
};

const DEFAULT_USERS = [
  { email: "gmendoza@finanfix.cl", full_name: "Gabriel Mendoza", role: "admin", mandante_name: null },
  { email: "lmendoza@finanfix.cl", full_name: "Luis Mendoza", role: "admin", mandante_name: null },
];

async function findMandanteByName(name: string | null) {
  if (!name) return null;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `select id, name from mandantes where lower(name) = lower($1) limit 1`,
      name
    )) as { id: string; name: string }[];
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function getMandantesByIds(ids: string[]) {
  if (!ids.length) return [] as { id: string; name: string }[];
  const rows = (await prisma.$queryRawUnsafe(
    `select id, name from mandantes where id = any($1::text[]) order by name asc`,
    ids
  )) as { id: string; name: string }[];
  return rows;
}

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret) as any;
  } catch {
    return null;
  }
}

function requireOnlyAdmin(req: any, res: any) {
  const session = getSession(req);

  if (!session) {
    res.status(401).json({ message: "Debes iniciar sesión." });
    return null;
  }

  if (String(session.role || "").toLowerCase() !== "admin") {
    res.status(403).json({ message: "Solo un administrador puede crear o administrar usuarios." });
    return null;
  }

  return session;
}

function publicRow(row: UserRow) {
  return {
    ...row,
    password_hash: undefined,
    assigned_mandante_ids: parseArray(row.assigned_mandante_ids),
    assigned_mandante_names: parseArray(row.assigned_mandante_names),
  };
}

usersRouter.get("/", async (req, res) => {
  await ensureUsersTable();
  const session = requireOnlyAdmin(req, res);
  if (!session) return;

  const rows = (await prisma.$queryRawUnsafe(`
      select id, email, full_name, role, mandante_id, mandante_name, assigned_mandante_ids, assigned_mandante_names, active, created_at, updated_at
      from operafix_users
      order by created_at desc
    `)) as UserRow[];

  res.json(rows.map(publicRow));
});

usersRouter.post("/", async (req, res) => {
  try {
    await ensureUsersTable();
    const session = requireOnlyAdmin(req, res);
    if (!session) return;

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const fullName = String(req.body.full_name || req.body.name || email).trim();
    const role = normalizeRole(req.body.role);

    const assignedIds = parseArray(req.body.assigned_mandante_ids || req.body.mandante_ids);
    const assignedMandantes = await getMandantesByIds(assignedIds);
    const assignedNames = assignedMandantes.map((m) => m.name);

    const primaryMandanteId = role === "admin" ? null : (assignedMandantes[0]?.id || (req.body.mandante_id ? String(req.body.mandante_id) : null));
    let primaryMandanteName = role === "admin" ? null : (assignedMandantes[0]?.name || (req.body.mandante_name ? String(req.body.mandante_name) : null));

    if (primaryMandanteId && !primaryMandanteName) {
      const rows = await getMandantesByIds([primaryMandanteId]);
      primaryMandanteName = rows[0]?.name || null;
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña son obligatorios." });
    }

    if (["interno", "kam", "cliente"].includes(role) && !assignedIds.length && !primaryMandanteId) {
      return res.status(400).json({ message: "Debes asignar al menos un mandante para usuarios internos, KAM o clientes." });
    }

    const finalAssignedIds = role === "admin" ? [] : Array.from(new Set([...(assignedIds || []), ...(primaryMandanteId ? [primaryMandanteId] : [])]));
    const finalAssignedNames = role === "admin" ? [] : Array.from(new Set([...(assignedNames || []), ...(primaryMandanteName ? [primaryMandanteName] : [])]));

    const hash = await bcrypt.hash(password, 10);

    const rows = (await prisma.$queryRawUnsafe(
      `
      insert into operafix_users
      (
        id,
        email,
        password_hash,
        full_name,
        role,
        mandante_id,
        mandante_name,
        assigned_mandante_ids,
        assigned_mandante_names,
        active
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
      returning
        id,
        email,
        full_name,
        role,
        mandante_id,
        mandante_name,
        assigned_mandante_ids,
        assigned_mandante_names,
        active,
        created_at,
        updated_at
    `,
      `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      hash,
      fullName,
      role,
      primaryMandanteId,
      primaryMandanteName,
      stringifyArray(finalAssignedIds),
      stringifyArray(finalAssignedNames)
    )) as UserRow[];

    res.status(201).json(publicRow(rows[0]));
  } catch (error: any) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "No se pudo crear el usuario.", detail: error?.message });
  }
});

usersRouter.delete("/:id", async (req, res) => {
  try {
    await ensureUsersTable();
    const session = requireOnlyAdmin(req, res);
    if (!session) return;

    await prisma.$executeRawUnsafe(
      `update operafix_users set active = false, updated_at = now() where id = $1`,
      String(req.params.id)
    );

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ message: "No se pudo desactivar el usuario.", detail: error?.message });
  }
});

usersRouter.post("/seed-defaults", async (req, res) => {
  try {
    await ensureUsersTable();
    const session = requireOnlyAdmin(req, res);
    if (!session) return;

    const password = String(req.body?.password || DEFAULT_PASSWORD);
    const hash = await bcrypt.hash(password, 10);

    for (const user of DEFAULT_USERS) {
      await prisma.$executeRawUnsafe(
        `insert into operafix_users (id, email, password_hash, full_name, role, mandante_id, mandante_name, assigned_mandante_ids, assigned_mandante_names, active)
         values ($1,$2,$3,$4,$5,null,null,$6,$7,true)
         on conflict (email) do update set password_hash = excluded.password_hash, full_name = excluded.full_name, role = excluded.role, active = true, updated_at = now()`,
        `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        user.email,
        hash,
        user.full_name,
        user.role,
        stringifyArray([]),
        stringifyArray([])
      );
    }

    res.json({ message: "Usuarios base creados/actualizados correctamente.", default_password: password });
  } catch (error: any) {
    console.error("Seed users error:", error);
    res.status(500).json({ message: "No se pudieron crear usuarios base.", detail: error?.message });
  }
});

export default usersRouter;
