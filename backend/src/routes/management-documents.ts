import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/prisma.js";

const managementDocumentsRouter = Router();

const storageRoot = path.resolve(process.cwd(), "storage", "management-documents");

if (!fs.existsSync(storageRoot)) {
  fs.mkdirSync(storageRoot, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, storageRoot);
    },
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ ]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

managementDocumentsRouter.get("/", async (req, res, next) => {
  try {
    const managementId =
      typeof req.query.management_id === "string" ? req.query.management_id : undefined;

    if (!managementId) {
      return res.status(400).json({ message: "management_id es requerido" });
    }

    const items = await prisma.document.findMany({
      where: { management_id: managementId },
      orderBy: { created_at: "desc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

managementDocumentsRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Archivo requerido" });
    }

    const managementId = String(req.body.management_id || "");
    if (!managementId) {
      return res.status(400).json({ message: "management_id es requerido" });
    }

    const fileUrl = `/storage/management-documents/${req.file.filename}`;

    const item = await prisma.document.create({
      data: {
        management_id: managementId,
        related_module: "managements",
        related_record_id: managementId,
        category: req.body.category || "OTRO",
        file_name: req.file.originalname,
        file_url: fileUrl,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by_id: req.body.uploaded_by_id || null,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

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
        mime_type: req.body.mime_type || null,
        uploaded_by_id: req.body.uploaded_by_id || null,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

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