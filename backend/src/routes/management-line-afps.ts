import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

const managementLineAfpsRouter = Router();

function toNullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

// LISTAR AFPs DE LÍNEAS
// IMPORTANTE: si Railway todavía no tiene la tabla nueva management_line_afps,
// este endpoint NO debe devolver 500 porque bloquea el formulario Crear Registro.
managementLineAfpsRouter.get("/", async (req, res) => {
  try {
    const lineId =
      typeof req.query.line_id === "string" ? req.query.line_id : undefined;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: Prisma.ManagementLineAfpWhereInput = {};

    if (lineId) where.line_id = lineId;

    if (search) {
      where.OR = [
        { afp_name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { owner_name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { current_status: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const items = await prisma.managementLineAfp.findMany({
      where,
      include: {
        line: {
          include: {
            mandante: true,
            group: true,
            company: true,
          },
        },
        managements: {
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: [{ afp_name: "asc" }, { created_at: "desc" }],
    });

    return res.json(items);
  } catch (error: any) {
    console.error(
      "ERROR /api/management-line-afps. Respondiendo [] en modo compatible Railway:",
      error?.message || error
    );

    return res.json([]);
  }
});

// OBTENER UNA AFP DE LÍNEA
managementLineAfpsRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.managementLineAfp.findUnique({
      where: { id: req.params.id },
      include: {
        line: {
          include: {
            mandante: true,
            group: true,
            company: true,
          },
        },
        managements: {
          orderBy: { created_at: "desc" },
        },
        lmRecords: {
          orderBy: { created_at: "desc" },
        },
        tpRecords: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ message: "AFP de línea no encontrada" });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// CREAR AFP EN LÍNEA
managementLineAfpsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.managementLineAfp.create({
      data: {
        line_id: req.body.line_id,
        afp_name: req.body.afp_name,
        owner_name: toNullableString(req.body.owner_name),
        current_status: toNullableString(req.body.current_status),
      },
      include: {
        line: {
          include: {
            mandante: true,
            group: true,
            company: true,
          },
        },
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// ACTUALIZAR AFP EN LÍNEA
managementLineAfpsRouter.put("/:id", async (req, res, next) => {
  try {
    const current = await prisma.managementLineAfp.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ message: "AFP de línea no encontrada" });
    }

    const item = await prisma.managementLineAfp.update({
      where: { id: req.params.id },
      data: {
        line_id: req.body.line_id ?? current.line_id,
        afp_name: req.body.afp_name ?? current.afp_name,
        owner_name:
          req.body.owner_name !== undefined
            ? toNullableString(req.body.owner_name)
            : current.owner_name,
        current_status:
          req.body.current_status !== undefined
            ? toNullableString(req.body.current_status)
            : current.current_status,
      },
      include: {
        line: {
          include: {
            mandante: true,
            group: true,
            company: true,
          },
        },
        managements: true,
      },
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// ELIMINAR AFP EN LÍNEA
managementLineAfpsRouter.delete("/:id", async (req, res, next) => {
  try {
    const current = await prisma.managementLineAfp.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ message: "AFP de línea no encontrada" });
    }

    await prisma.managementLineAfp.delete({
      where: { id: req.params.id },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default managementLineAfpsRouter;