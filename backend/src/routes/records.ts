import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../config/prisma.js";

const recordsRouter = Router();

const storageRoot = path.resolve(process.cwd(), "storage", "management-documents");
if (!fs.existsSync(storageRoot)) fs.mkdirSync(storageRoot, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storageRoot),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ ]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

function nullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function nullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toBoolean(value: unknown) {
  return value === true || value === "true" || value === "1" || value === "Sí" || value === "Si";
}

function mapDocumentCategory(value: unknown) {
  const raw = String(value || "OTRO").trim().toLowerCase();
  const map: Record<string, any> = {
    poder: "PODER",
    "carta explicativa": "CARTA_EXPLICATIVA",
    "archivo afp": "ARCHIVO_AFP",
    "archivo gestión": "ARCHIVO_GESTION",
    "archivo gestion": "ARCHIVO_GESTION",
    "detalle de pago": "DETALLE_TRABAJADORES",
    "detalle trabajadores": "DETALLE_TRABAJADORES",
    "comprobante pago": "COMPROBANTE_PAGO",
    "comprobante de pago": "COMPROBANTE_PAGO",
    "comprobante rechazo": "OTRO",
    "archivo respuesta cen": "RESPUESTA_CEN",
    factura: "FACTURA",
    oc: "ORDEN_COMPRA",
    "orden de compra": "ORDEN_COMPRA",
    otro: "OTRO",
  };
  return map[raw] || "OTRO";
}

function managementData(body: any) {
  return {
    management_type: body.management_type === "TP" ? "TP" : "LM",
    owner_name: nullableString(body.owner_name),
    estado_contrato_cliente: nullableString(body.estado_contrato_cliente),
    fecha_termino_contrato: nullableDate(body.fecha_termino_contrato),
    motivo_tipo_exceso: nullableString(body.motivo_tipo_exceso),
    mes_produccion_2026: nullableString(body.mes_produccion_2026),
    entidad: nullableString(body.entidad),
    envio_afp: nullableString(body.envio_afp),
    estado_gestion: nullableString(body.estado_gestion),
    fecha_presentacion_afp: nullableDate(body.fecha_presentacion_afp),
    fecha_ingreso_afp: nullableDate(body.fecha_ingreso_afp),
    fecha_pago_afp: nullableDate(body.fecha_pago_afp),
    numero_solicitud: nullableString(body.numero_solicitud),
    grupo_empresa: nullableString(body.grupo_empresa),
    razon_social: nullableString(body.razon_social),
    rut: nullableString(body.rut),
    monto_devolucion: nullableNumber(body.monto_devolucion),
    monto_pagado: nullableNumber(body.monto_pagado),
    monto_cliente: nullableNumber(body.monto_cliente),
    fee: nullableNumber(body.fee),
    monto_finanfix_solutions: nullableNumber(body.monto_finanfix_solutions),
    banco: nullableString(body.banco),
    tipo_cuenta: nullableString(body.tipo_cuenta),
    numero_cuenta: nullableString(body.numero_cuenta),
    confirmacion_cc: toBoolean(body.confirmacion_cc),
    confirmacion_poder: toBoolean(body.confirmacion_poder),
    acceso_portal: nullableString(body.acceso_portal),
    facturado_finanfix: nullableString(body.facturado_finanfix),
    facturado_cliente: nullableString(body.facturado_cliente),
    fecha_factura_finanfix: nullableDate(body.fecha_factura_finanfix),
    fecha_pago_factura_finanfix: nullableDate(body.fecha_pago_factura_finanfix),
    numero_factura: nullableString(body.numero_factura),
    numero_oc: nullableString(body.numero_oc),
    fecha_rechazo: nullableDate(body.fecha_rechazo),
    motivo_rechazo: nullableString(body.motivo_rechazo),
    consulta_cen: nullableString(body.consulta_cen),
    contenido_cen: nullableString(body.contenido_cen),
    respuesta_cen: nullableString(body.respuesta_cen),
    estado_trabajador: nullableString(body.estado_trabajador),
    comment: nullableString(body.comment),
    last_activity_at: new Date(),
  };
}

const recordInclude = {
  mandante: true,
  group: true,
  company: true,
  line: true,
  lineAfp: true,
  documents: true,
  notes: { orderBy: { created_at: "desc" as const } },
  activities: { orderBy: { created_at: "desc" as const } },
};

recordsRouter.get("/", async (req, res, next) => {
  try {
    const mandante = typeof req.query.mandante === "string"
  ? req.query.mandante
  : undefined;
    const lineAfpId = typeof req.query.line_afp_id === "string" ? req.query.line_afp_id : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const rows = await prisma.management.findMany({
      where: {
        mandante_id: mandante,
        line_afp_id: lineAfpId,
        OR: search
          ? [
              { razon_social: { contains: search, mode: "insensitive" } },
              { rut: { contains: search, mode: "insensitive" } },
              { entidad: { contains: search, mode: "insensitive" } },
              { estado_gestion: { contains: search, mode: "insensitive" } },
              { numero_solicitud: { contains: search, mode: "insensitive" } },
              { grupo_empresa: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        mandante: true,
        group: true,
        company: true,
        line: true,
        lineAfp: true,
        documents: true,
      },
      orderBy: { created_at: "desc" },
    });

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

recordsRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await prisma.management.findUnique({
      where: { id: Number(req.params.id) }, // 🔥 ESTE CAMBIO
      include: recordInclude,
    });

    if (!row) return res.status(404).json({ message: "Registro no encontrado" });

    res.json(row);
  } catch (error) {
    next(error);
  }
});

recordsRouter.post("/", async (req, res, next) => {
  try {
    const row = await prisma.management.create({
      data: ({
        mandante_id: req.body.mandante_id,
        group_id: req.body.group_id || null,
        company_id: req.body.company_id,
        line_id: req.body.line_id,
        line_afp_id: req.body.line_afp_id || null,
        ...managementData(req.body),
      } as any),
      include: recordInclude,
    });

    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: row.id,
        management_id: row.id,
        activity_type: "CREACIÓN",
        status: "Completada",
        description: "Registro de empresa creado",
      },
    });

    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

recordsRouter.put("/:id", async (req, res, next) => {
  try {
    const previous = await prisma.management.findUnique({ where: { id: Number(req.params.id) } });
    if (!previous) return res.status(404).json({ message: "Registro no encontrado" });

    const row = await prisma.management.update({
      where: { id: Number(req.params.id) },
      data: managementData(req.body) as any,
      include: recordInclude,
    });

    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: row.id,
        management_id: row.id,
        activity_type: "EDICIÓN",
        status: "Completada",
        description: "Registro actualizado desde ficha de detalle",
      },
    });

    res.json(row);
  } catch (error) {
    next(error);
  }
});

recordsRouter.post("/:id/notes", async (req, res, next) => {
  try {
    const recordId = String(req.params.id);
    const note = await prisma.note.create({
      data: {
        related_module: "records",
        related_record_id: recordId,
        management_id: recordId,
        content: String(req.body.content || ""),
      },
    });
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

recordsRouter.post("/:id/documents/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Archivo requerido" });

    const recordId = String(req.params.id);
    const fileUrl = `/storage/management-documents/${req.file.filename}`;
    const doc = await prisma.document.create({
      data: {
        management_id: recordId,
        related_module: "records",
        related_record_id: recordId,
        category: mapDocumentCategory(req.body.category) as any,
        file_name: req.file.originalname,
        file_url: fileUrl,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by_id: req.body.uploaded_by_id || null,
      },
    });

    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: recordId,
        management_id: recordId,
        activity_type: "DOCUMENTO",
        status: "Completada",
        description: `Documento cargado: ${req.file.originalname}`,
      },
    });

    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
});

export default recordsRouter;
