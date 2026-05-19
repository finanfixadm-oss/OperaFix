import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ensureUsersTable, normalizeRole } from "./auth.js";

const usersRouter = Router();

type UserRow = {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: string;
  mandante_id?: string | null;
  mandante_name?: string | null;
  active?: boolean;
  created_at?: Date;
  updated_at?: Date;
  assigned_mandantes?: { id: string; name: string }[];
  assigned_mandante_ids?: string[];
  assigned_mandante_names?: string[];
};

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret) as any;
  } catch {
    return null;
  }
}

function requireAdmin(req: any, res: any) {
  const session = getSession(req);

  if (!session) {
    res.status(401).json({ message: "Debes iniciar sesión." });
    return null;
  }

  if (String(session.role || "").toLowerCase() !== "admin") {
    res.status(403).json({
      message: "Solo un administrador puede crear, modificar o desactivar usuarios.",
    });
    return null;
  }

  return session;
}

function cleanIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

async function resolveMandantes(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids));
  if (!uniqueIds.length) return [] as { id: string; name: string }[];

  const rows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `
      select id, name
      from mandantes
      where id = any($1::text[])
      order by name asc
    `,
    uniqueIds
  ).catch(() => [] as { id: string; name: string }[]);

  return rows.map((row) => ({ id: String(row.id), name: String(row.name) }));
}

async function loadAssignedMandantesForUsers(userIds: string[]) {
  if (!userIds.length) return new Map<string, { id: string; name: string }[]>();

  const rows = await prisma.$queryRawUnsafe<{ user_id: string; id: string; name: string }[]>(
    `
      select user_id, mandante_id as id, mandante_name as name
      from operafix_user_mandantes
      where user_id = any($1::text[])
      order by mandante_name asc
    `,
    userIds
  ).catch(() => [] as { user_id: string; id: string; name: string }[]);

  const map = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const current = map.get(row.user_id) || [];
    current.push({ id: String(row.id), name: String(row.name) });
    map.set(row.user_id, current);
  }

  return map;
}

async function attachAssignments(rows: UserRow[]) {
  const map = await loadAssignedMandantesForUsers(rows.map((row) => row.id));
  return rows.map((row) => {
    const fallback =
      row.mandante_id && row.mandante_name
        ? [{ id: row.mandante_id, name: row.mandante_name }]
        : [];
    const assigned = map.get(row.id) || fallback;

    return {
      ...row,
      assigned_mandantes: assigned,
      assigned_mandante_ids: assigned.map((item) => item.id),
      assigned_mandante_names: assigned.map((item) => item.name),
    };
  });
}

async function saveAssignments(userId: string, role: string, mandanteIds: string[], singleMandanteName?: string | null) {
  await prisma.$executeRawUnsafe(`delete from operafix_user_mandantes where user_id = $1`, userId);

  if (role === "admin") {
    await prisma.$executeRawUnsafe(
      `update operafix_users set mandante_id = null, mandante_name = null, updated_at = now() where id = $1`,
      userId
    );
    return [] as { id: string; name: string }[];
  }

  const mandantes = await resolveMandantes(mandanteIds);

  for (const mandante of mandantes) {
    await prisma.$executeRawUnsafe(
      `
        insert into operafix_user_mandantes (id, user_id, mandante_id, mandante_name)
        values ($1,$2,$3,$4)
        on conflict (user_id, mandante_id)
        do update set mandante_name = excluded.mandante_name
      `,
      `uum_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      mandante.id,
      mandante.name
    );
  }

  const primary = mandantes[0] || null;

  await prisma.$executeRawUnsafe(
    `update operafix_users set mandante_id = $2, mandante_name = $3, updated_at = now() where id = $1`,
    userId,
    primary?.id || null,
    primary?.name || singleMandanteName || null
  );

  return mandantes;
}

usersRouter.get("/", async (req, res) => {
  await ensureUsersTable();

  const session = requireAdmin(req, res);
  if (!session) return;

  const rows = (await prisma.$queryRawUnsafe(`
      select id, email, full_name, role, mandante_id, mandante_name, active, created_at, updated_at
      from operafix_users
      order by created_at desc
    `)) as UserRow[];

  res.json(await attachAssignments(rows));
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

    const mandanteIds = [
      ...cleanIds(req.body.assigned_mandante_ids),
      ...cleanIds(req.body.mandante_ids),
      ...(req.body.mandante_id ? [String(req.body.mandante_id)] : []),
    ];

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña son obligatorios." });
    }

    if (role !== "admin" && mandanteIds.length === 0) {
      return res.status(400).json({
        message: "Debes asignar al menos un mandante para usuarios internos, KAM o clientes.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
        active
      )
      values ($1,$2,$3,$4,$5,null,null,true)
      returning
        id,
        email,
        full_name,
        role,
        mandante_id,
        mandante_name,
        active,
        created_at,
        updated_at
    `,
      userId,
      email,
      hash,
      fullName,
      role
    )) as UserRow[];

    const assigned = await saveAssignments(userId, role, mandanteIds, null);

    res.status(201).json({
      ...rows[0],
      assigned_mandantes: assigned,
      assigned_mandante_ids: assigned.map((item) => item.id),
      assigned_mandante_names: assigned.map((item) => item.name),
    });
  } catch (error: any) {
    console.error("Create user error:", error);

    res.status(500).json({
      message: "No se pudo crear el usuario.",
      detail: error?.message,
    });
  }
});

usersRouter.put("/:id", async (req, res) => {
  try {
    await ensureUsersTable();

    const session = requireAdmin(req, res);
    if (!session) return;

    const userId = String(req.params.id);
    const fullName = String(req.body.full_name || req.body.name || "").trim();
    const role = normalizeRole(req.body.role);
    const active = req.body.active === undefined ? undefined : Boolean(req.body.active);
    const password = String(req.body.password || "");

    const mandanteIds = [
      ...cleanIds(req.body.assigned_mandante_ids),
      ...cleanIds(req.body.mandante_ids),
      ...(req.body.mandante_id ? [String(req.body.mandante_id)] : []),
    ];

    if (role !== "admin" && mandanteIds.length === 0) {
      return res.status(400).json({
        message: "Debes asignar al menos un mandante para usuarios internos, KAM o clientes.",
      });
    }

    if (fullName) {
      await prisma.$executeRawUnsafe(
        `update operafix_users set full_name = $2, role = $3, updated_at = now() where id = $1`,
        userId,
        fullName,
        role
      );
    } else {
      await prisma.$executeRawUnsafe(
        `update operafix_users set role = $2, updated_at = now() where id = $1`,
        userId,
        role
      );
    }

    if (active !== undefined) {
      await prisma.$executeRawUnsafe(
        `update operafix_users set active = $2, updated_at = now() where id = $1`,
        userId,
        active
      );
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await prisma.$executeRawUnsafe(
        `update operafix_users set password_hash = $2, updated_at = now() where id = $1`,
        userId,
        hash
      );
    }

    const assigned = await saveAssignments(userId, role, mandanteIds, null);

    const rows = await prisma.$queryRawUnsafe<UserRow[]>(
      `
        select id, email, full_name, role, mandante_id, mandante_name, active, created_at, updated_at
        from operafix_users
        where id = $1
        limit 1
      `,
      userId
    );

    if (!rows[0]) return res.status(404).json({ message: "Usuario no encontrado." });

    res.json({
      ...rows[0],
      assigned_mandantes: assigned,
      assigned_mandante_ids: assigned.map((item) => item.id),
      assigned_mandante_names: assigned.map((item) => item.name),
    });
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "No se pudo actualizar el usuario.", detail: error?.message });
  }
});

usersRouter.delete("/:id", async (req, res) => {
  try {
    await ensureUsersTable();

    const session = requireAdmin(req, res);
    if (!session) return;

    const userId = String(req.params.id);

    await prisma.$executeRawUnsafe(
      `update operafix_users set active = false, updated_at = now() where id = $1`,
      userId
    );

    res.json({ ok: true });
  } catch (error: any) {
    console.error("Disable user error:", error);
    res.status(500).json({ message: "No se pudo desactivar el usuario.", detail: error?.message });
  }
});

export default usersRouter;
