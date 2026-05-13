import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { ensureUsersTable, normalizeRole } from "./auth.js";

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
  active?: boolean;
  created_at?: Date;
  updated_at?: Date;
};

const DEFAULT_USERS = [
  {
    email: "gmendoza@finanfix.cl",
    full_name: "Gabriel Mendoza",
    role: "admin",
    mandante_name: null,
  },
  {
    email: "lmendoza@finanfix.cl",
    full_name: "Luis Mendoza",
    role: "admin",
    mandante_name: null,
  },
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
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `select id, name from mandante where lower(name) = lower($1) limit 1`,
        name
      )) as { id: string; name: string }[];

      return rows[0] || null;
    } catch {
      return null;
    }
  }
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

function requireAdmin(req: any, res: any) {
  const session = getSession(req);

  if (!session) {
    res.status(401).json({
      message: "Debes iniciar sesión.",
    });

    return null;
  }

  if (
    !["admin", "interno"].includes(
      String(session.role || "").toLowerCase()
    )
  ) {
    res.status(403).json({
      message:
        "No tienes permisos para administrar usuarios.",
    });

    return null;
  }

  return session;
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

  res.json(rows);
});

usersRouter.post("/", async (req, res) => {
  try {
    await ensureUsersTable();

    const session = requireAdmin(req, res);

    if (!session) return;

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    const fullName = String(
      req.body.full_name ||
        req.body.name ||
        email
    ).trim();

    const role = normalizeRole(req.body.role);

    const mandanteId = req.body.mandante_id
      ? String(req.body.mandante_id)
      : null;

    let mandanteName = req.body.mandante_name
      ? String(req.body.mandante_name)
      : null;

    if (mandanteId && !mandanteName) {
      const m = await prisma.mandante
        .findUnique({
          where: { id: mandanteId },
        })
        .catch(() => null);

      mandanteName = m?.name || null;
    }

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Correo y contraseña son obligatorios.",
      });
    }

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
        active
      )
      values ($1,$2,$3,$4,$5,$6,$7,true)
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
      `usr_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      email,
      hash,
      fullName,
      role,
      mandanteId,
      mandanteName
    )) as UserRow[];

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error("Create user error:", error);

    res.status(500).json({
      message:
        "No se pudo crear el usuario.",
      detail: error?.message,
    });
  }
});

export default usersRouter;