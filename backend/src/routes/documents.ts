import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ensureUploadDir } from "../utils/storage.js";
import { prisma } from "../config/prisma.js";

const uploadDir = ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({ storage });

export const documentsRouter = Router();

documentsRouter.get("/", async (req, res, next) => {
  try {
    const relatedModule = String(req.query.related_module || "");
    const relatedRecordId = String(req.query.related_record_id || "");
    const docs = await prisma.document.findMany({
      where: {
        ...(relatedModule ? { related_module: relatedModule } : {}),
        ...(relatedRecordId ? { related_record_id: relatedRecordId } : {})
      },
      orderBy: { created_at: "desc" }
    });
    res.json(docs);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Archivo no enviado" });
    }

    const relatedModule = String(req.body.related_module || "documents");
    const relatedRecordId = req.body.related_record_id || null;
    const companyId = req.body.company_id || null;

    const document = await prisma.document.create({
      data: {
        title: req.body.title || req.file.originalname,
        original_filename: req.file.originalname,
        stored_filename: req.file.filename,
        storage_path: req.file.path,
        related_module: relatedModule,
        related_record_id: relatedRecordId,
        company_id: companyId,
        mime_type: req.file.mimetype,
        file_size: BigInt(req.file.size)
      }
    });

    if (relatedModule === "lm_records" && relatedRecordId) {
      await prisma.activity.create({
        data: {
          related_module: "lm_records",
          related_record_id: relatedRecordId,
          activity_type: "document",
          description: `Documento cargado: ${document.title}`
        }
      });
    }

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});
