import { Router } from "express";
import { prisma } from "../config/prisma.js";

const documentsRouter = Router();

documentsRouter.get("/", async (req, res, next) => {
  try {
    const relatedModule =
      typeof req.query.related_module === "string" ? req.query.related_module : undefined;
    const relatedRecordId =
      typeof req.query.related_record_id === "string"
        ? req.query.related_record_id
        : undefined;

    const items = await prisma.document.findMany({
      where: {
        related_module: relatedModule,
        related_record_id: relatedRecordId,
      },
      orderBy: { created_at: "desc" },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", async (req, res, next) => {
  try {
    const doc = await prisma.document.create({
      data: {
        file_name: req.body.file_name,
        file_url: req.body.file_url,
        related_module: req.body.related_module,
        related_record_id: req.body.related_record_id,
        file_size:
          req.body.file_size !== undefined && req.body.file_size !== null
            ? Number(req.body.file_size)
            : null,
        mime_type: req.body.mime_type || null,
        category: req.body.category || "OTRO",
        management_id: req.body.management_id || null,
      },
    });

    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
});

export default documentsRouter;