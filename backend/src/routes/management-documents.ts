import { Router } from "express";
import { prisma } from "../config/prisma.js";

const managementDocumentsRouter = Router();

function toNullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// LISTAR DOCUMENTOS DE UNA GESTIÓN
managementDocumentsRouter.get("/", async (req, res, next) => {
  try {
    const managementId =
      typeof req.query.management_id === "string" ? req.query.management_id : undefined;

    if (!managementId) {
      return res.status(400).json({ message: "management_id es requerido" });
    }

    const items = await prisma.document.findMany({
      where: {
        management_id: managementId,
      },
      orderBy: { created_at: "desc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

// OBTENER DOCUMENTO POR ID
managementDocumentsRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        management: {
          include: {
            mandante: true,
            company: true,
            line: true,
            lineAfp: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// CREAR DOCUMENTO
managementDocumentsRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.document.create({
      data: {
        management_id: req.body.management_id,
        related_module: req.body.related_module || "managements",
        related_record_id: req.body.related_record_id || req.body.management_id,
        category: req.body.category || "OTRO",
        file_name: req.body.file_name,
        file_url: req.body.file_url,
        file_size: toNullableNumber(req.body.file_size),
        mime_type: toNullableString(req.body.mime_type),
        uploaded_by_id: toNullableString(req.body.uploaded_by_id),
      },
      include: {
        management: {
          include: {
            mandante: true,
            company: true,
            line: true,
            lineAfp: true,
          },
        },
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// ACTUALIZAR DOCUMENTO
managementDocumentsRouter.put("/:id", async (req, res, next) => {
  try {
    const current = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    const item = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        management_id:
          req.body.management_id !== undefined
            ? req.body.management_id
            : current.management_id,
        related_module:
          req.body.related_module !== undefined
            ? req.body.related_module
            : current.related_module,
        related_record_id:
          req.body.related_record_id !== undefined
            ? req.body.related_record_id
            : current.related_record_id,
        category:
          req.body.category !== undefined ? req.body.category : current.category,
        file_name:
          req.body.file_name !== undefined ? req.body.file_name : current.file_name,
        file_url:
          req.body.file_url !== undefined ? req.body.file_url : current.file_url,
        file_size:
          req.body.file_size !== undefined
            ? toNullableNumber(req.body.file_size)
            : current.file_size,
        mime_type:
          req.body.mime_type !== undefined
            ? toNullableString(req.body.mime_type)
            : current.mime_type,
        uploaded_by_id:
          req.body.uploaded_by_id !== undefined
            ? toNullableString(req.body.uploaded_by_id)
            : current.uploaded_by_id,
      },
      include: {
        management: {
          include: {
            mandante: true,
            company: true,
            line: true,
            lineAfp: true,
          },
        },
      },
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// ELIMINAR DOCUMENTO
managementDocumentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const current = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!current) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    await prisma.document.delete({
      where: { id: req.params.id },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default managementDocumentsRouter;