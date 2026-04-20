import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ensureUploadDir } from "../utils/storage.js";
import { prisma } from "../config/prisma.js";

const uploadDir = ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({ storage });

export const documentsRouter = Router();

documentsRouter.get("/", async (_req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
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

    const document = await prisma.document.create({
      data: {
        title: req.body.title || req.file.originalname,
        original_filename: req.file.originalname,
        stored_filename: req.file.filename,
        storage_path: req.file.path,
        related_module: req.body.related_module || "documents",
        related_record_id: req.body.related_record_id || null,
        company_id: req.body.company_id || null,
        mime_type: req.file.mimetype,
        file_size: BigInt(req.file.size)
      }
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});
