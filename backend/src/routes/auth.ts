import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

const authRouter = Router();

type AssignedMandante = {
  id: string;
  name: string;
};

type OperafixUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  mandante_id: string | null;
  mandante_name: string | null;
  active: boolean;
  assigned_mandantes?: AssignedMandante[];
  assigned_mandante_ids?: string[];
  assigned_mandante_names?: string[];
};

async function ensureUsersTable() {
  await prisma.$executeRawUnsafe(`
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
    )
  `);

  await prisma.$executeRawUnsafe(`
    create table if not exists operafix_user_mandantes (
      id text primary key,
      user_id text not null,
      mandante_id text not null,
      mandante_name text not null,
      created_at timestamp not null default now(),
      unique(user_id, mandante_id)
    )
  `);
}

function normalizeRole(value: unknown) {
  const role = String(value || "admin").toLowerCase().trim();
  if (["admin", "interno", "kam_admin", "kam", "cliente"].includes(role)) return role;
  return "cliente";
}

async function loadAssignedMandantes(userId: string): Promise<AssignedMandante[]> {
  await ensureUsersTable();

  const rows = await prisma.$queryRawUnsafe<AssignedMandante[]>(
    `
      select mandante_id as id, mandante_name as name
      from operafix_user_mandantes
      where user_id = $1
      order by mandante_name asc
    `,
    userId
  );

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
  }));
}

function withAssignedMandantes(user: OperafixUser, assigned: AssignedMandante[]): OperafixUser {
  const fallback =
    user.mandante_id && user.mandante_name
      ? [{ id: user.mandante_id, name: user.mandante_name }]
      : [];

  const cleanAssigned = assigned.length ? assigned : fallback;

  return {
    ...user,
    assigned_mandantes: cleanAssigned,
    assigned_mandante_ids: cleanAssigned.map((item) => item.id),
    assigned_mandante_names: cleanAssigned.map((item) => item.name),
  };
}

async function hydrateUser(user: OperafixUser): Promise<OperafixUser> {
  const assigned = await loadAssignedMandantes(user.id);
  return withAssignedMandantes(user, assigned);
}

function signToken(user: OperafixUser) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      mandante_id: user.mandante_id,
      mandante_name: user.mandante_name,
      assigned_mandantes: user.assigned_mandantes || [],
      assigned_mandante_ids: user.assigned_mandante_ids || [],
      assigned_mandante_names: user.assigned_mandante_names || [],
      full_name: user.full_name,
    },
    env.jwtSecret,
    { expiresIn: "10h" }
  );
}

function publicUser(user: OperafixUser) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    mandante_id: user.mandante_id,
    mandante_name: user.mandante_name,
    assigned_mandantes: user.assigned_mandantes || [],
    assigned_mandante_ids: user.assigned_mandante_ids || [],
    assigned_mandante_names: user.assigned_mandante_names || [],
    active: user.active,
  };
}

authRouter.post("/login", async (req, res) => {
  try {
    await ensureUsersTable();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) return res.status(400).json({ message: "Correo y contraseña son obligatorios." });

    const countRows = await prisma.$queryRawUnsafe<{ count: string }[]>(`select count(*)::text as count from operafix_users`);
    const userCount = Number(countRows[0]?.count || 0);

    if (userCount === 0) {
      const hash = await bcrypt.hash(password, 10);
      const created = await prisma.$queryRawUnsafe<OperafixUser[]>(
        `insert into operafix_users (id, email, password_hash, full_name, role, active)
         values ($1, $2, $3, $4, $5, true)
         returning id, email, full_name, role, mandante_id, mandante_name, active`,
        `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email,
        hash,
        "Administrador OperaFix",
        "admin"
      );
      const user = await hydrateUser(created[0]);
      return res.json({ token: signToken(user), user: publicUser(user), first_admin_created: true });
    }

    const rows = await prisma.$queryRawUnsafe<(OperafixUser & { password_hash: string })[]>(
      `select id, email, password_hash, full_name, role, mandante_id, mandante_name, active
       from operafix_users
       where lower(email) = lower($1)
       limit 1`,
      email
    );
    const rawUser = rows[0];
    if (!rawUser || !rawUser.active) return res.status(401).json({ message: "Usuario o contraseña inválidos." });

    const ok = await bcrypt.compare(password, rawUser.password_hash);
    if (!ok) return res.status(401).json({ message: "Usuario o contraseña inválidos." });

    const user = await hydrateUser(rawUser);
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "No se pudo iniciar sesión.", detail: error?.message });
  }
});

authRouter.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (!auth) return res.status(401).json({ message: "Token no enviado" });
    const payload = jwt.verify(auth, env.jwtSecret) as any;
    return res.json({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      mandante_id: payload.mandante_id || null,
      mandante_name: payload.mandante_name || null,
      assigned_mandantes: payload.assigned_mandantes || [],
      assigned_mandante_ids: payload.assigned_mandante_ids || [],
      assigned_mandante_names: payload.assigned_mandante_names || [],
      full_name: payload.full_name || payload.email,
    });
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
});

export default authRouter;
export { ensureUsersTable, normalizeRole, publicUser, signToken, loadAssignedMandantes, hydrateUser };
