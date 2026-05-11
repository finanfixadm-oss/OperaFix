import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

const authRouter = Router();

type OperafixUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  mandante_id: string | null;
  mandante_name: string | null;
  active: boolean;
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
}

function normalizeRole(value: unknown) {
  const role = String(value || "admin").toLowerCase().trim();
  if (["admin", "interno", "kam", "cliente"].includes(role)) return role;
  return "cliente";
}

function signToken(user: OperafixUser) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      mandante_id: user.mandante_id,
      mandante_name: user.mandante_name,
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
      const user = created[0];
      return res.json({ token: signToken(user), user: publicUser(user), first_admin_created: true });
    }

    const rows = await prisma.$queryRawUnsafe<(OperafixUser & { password_hash: string })[]>(
      `select id, email, password_hash, full_name, role, mandante_id, mandante_name, active
       from operafix_users
       where lower(email) = lower($1)
       limit 1`,
      email
    );
    const user = rows[0];
    if (!user || !user.active) return res.status(401).json({ message: "Usuario o contraseña inválidos." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Usuario o contraseña inválidos." });

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
      full_name: payload.full_name || payload.email,
    });
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
});

export default authRouter;
export { ensureUsersTable, normalizeRole, publicUser, signToken };
