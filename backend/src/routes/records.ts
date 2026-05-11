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

function hasOwn(body: any, key: string) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

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

const fieldParsers: Record<string, (value: unknown) => unknown> = {
  management_type: (v) => (v === "TP" ? "TP" : "LM"),
  owner_name: nullableString,
  estado_contrato_cliente: nullableString,
  fecha_termino_contrato: nullableDate,
  motivo_tipo_exceso: nullableString,
  mes_produccion_2026: nullableString,
  mes_ingreso_solicitud: nullableString,
  entidad: nullableString,
  envio_afp: nullableString,
  estado_gestion: nullableString,
  fecha_presentacion_afp: nullableDate,
  fecha_ingreso_afp: nullableDate,
  fecha_pago_afp: nullableDate,
  numero_solicitud: nullableString,
  grupo_empresa: nullableString,
  razon_social: nullableString,
  rut: nullableString,
  direccion: nullableString,
  monto_devolucion: nullableNumber,
  monto_pagado: nullableNumber,
  monto_cliente: nullableNumber,
  monto_finanfix_solutions: nullableNumber,
  monto_real_cliente: nullableNumber,
  monto_real_finanfix_solutions: nullableNumber,
  fee: nullableNumber,
  banco: nullableString,
  tipo_cuenta: nullableString,
  numero_cuenta: nullableString,
  confirmacion_cc: toBoolean,
  confirmacion_poder: toBoolean,
  acceso_portal: nullableString,
  facturado_finanfix: nullableString,
  facturado_cliente: nullableString,
  fecha_factura_finanfix: nullableDate,
  fecha_pago_factura_finanfix: nullableDate,
  fecha_notificacion_cliente: nullableDate,
  numero_factura: nullableString,
  numero_oc: nullableString,
  fecha_rechazo: nullableDate,
  motivo_rechazo: nullableString,
  consulta_cen: nullableString,
  contenido_cen: nullableString,
  respuesta_cen: nullableString,
  estado_trabajador: nullableString,
  comment: nullableString,
};

function managementCreateData(body: any) {
  const data: Record<string, unknown> = {};
  for (const [key, parser] of Object.entries(fieldParsers)) {
    if (key === "management_type") data[key] = parser(body[key]);
    else data[key] = parser(body[key]);
  }
  data.last_activity_at = new Date();
  return data;
}

function managementPatchData(body: any) {
  const data: Record<string, unknown> = {};
  for (const [key, parser] of Object.entries(fieldParsers)) {
    if (hasOwn(body, key)) data[key] = parser(body[key]);
  }

  if (hasOwn(body, "mandante_id")) data.mandante_id = nullableString(body.mandante_id);
  if (hasOwn(body, "group_id")) data.group_id = nullableString(body.group_id);
  if (hasOwn(body, "company_id")) data.company_id = nullableString(body.company_id);
  if (hasOwn(body, "line_id")) data.line_id = nullableString(body.line_id);
  if (hasOwn(body, "line_afp_id")) data.line_afp_id = nullableString(body.line_afp_id);

  data.last_activity_at = new Date();
  return data;
}

const recordInclude = {
  mandante: true,
  group: true,
  company: true,
  line: true,
  lineAfp: true,
  documents: { orderBy: { created_at: "desc" as const } },
  notes: { orderBy: { created_at: "desc" as const } },
  activities: { orderBy: { created_at: "desc" as const } },
};

async function ensureRecordContext(body: any) {
  const managementType = body.management_type === "TP" ? "TP" : "LM";
  const requestedAfpId = nullableString(body.line_afp_id);

  if (requestedAfpId) {
    const lineAfp = await prisma.managementLineAfp.findUnique({
      where: { id: requestedAfpId },
      include: { line: true },
    });

    if (lineAfp?.line) {
      return {
        mandante_id: lineAfp.line.mandante_id,
        group_id: lineAfp.line.group_id || null,
        company_id: lineAfp.line.company_id,
        line_id: lineAfp.line.id,
        line_afp_id: lineAfp.id,
      };
    }
  }

  let mandante = null;
  const requestedMandanteId = nullableString(body.mandante_id);
  if (requestedMandanteId) {
    mandante = await prisma.mandante.findUnique({ where: { id: requestedMandanteId } });
  }

  if (!mandante) {
    const mandanteName = nullableString(body.mandante_name) || "Sin mandante";
    mandante = await prisma.mandante.upsert({
      where: { name: mandanteName },
      update: {},
      create: { name: mandanteName },
    });
  }

  const razonSocial = nullableString(body.razon_social) || "Empresa sin razón social";
  const rut = nullableString(body.rut) || `TEMP-${Date.now()}`;
  const afpName = nullableString(body.entidad) || "AFP Capital";
  const groupName = nullableString(body.grupo_empresa) || "Grupo general";

  const group = await prisma.companyGroup.upsert({
    where: {
      mandante_id_group_type_name: {
        mandante_id: mandante.id,
        group_type: managementType as any,
        name: groupName,
      },
    },
    update: {},
    create: {
      mandante_id: mandante.id,
      group_type: managementType as any,
      name: groupName,
    },
  });

  const company = await prisma.company.upsert({
    where: { rut },
    update: {
      razon_social: razonSocial,
      mandante_id: mandante.id,
      group_id: group.id,
    },
    create: {
      mandante_id: mandante.id,
      group_id: group.id,
      razon_social: razonSocial,
      rut,
    },
  });

  let line = await prisma.managementLine.findFirst({
    where: {
      mandante_id: mandante.id,
      group_id: group.id,
      company_id: company.id,
      line_type: managementType as any,
    },
  });

  if (!line) {
    line = await prisma.managementLine.create({
      data: {
        mandante_id: mandante.id,
        group_id: group.id,
        company_id: company.id,
        line_type: managementType as any,
        name: `${razonSocial} - ${managementType}`,
      },
    });
  }

  const lineAfp = await prisma.managementLineAfp.upsert({
    where: {
      line_id_afp_name: {
        line_id: line.id,
        afp_name: afpName,
      },
    },
    update: {},
    create: {
      line_id: line.id,
      afp_name: afpName,
      current_status: nullableString(body.estado_gestion) || "Pendiente Gestión",
    },
  });

  return {
    mandante_id: mandante.id,
    group_id: group.id,
    company_id: company.id,
    line_id: line.id,
    line_afp_id: lineAfp.id,
  };
}

recordsRouter.get("/", async (req, res, next) => {
  try {
    const mandanteId = typeof req.query.mandante_id === "string" ? req.query.mandante_id : undefined;
    const mandante = typeof req.query.mandante === "string" ? req.query.mandante : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: any = {};

    if (mandanteId) where.mandante_id = mandanteId;
    if (mandante) where.mandante = { name: { contains: mandante, mode: "insensitive" } };
    if (search) {
      where.OR = [
        { razon_social: { contains: search, mode: "insensitive" } },
        { rut: { contains: search, mode: "insensitive" } },
        { entidad: { contains: search, mode: "insensitive" } },
        { estado_gestion: { contains: search, mode: "insensitive" } },
        { numero_solicitud: { contains: search, mode: "insensitive" } },
        { grupo_empresa: { contains: search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.management.findMany({
      where,
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
    console.error("ERROR /api/records", error);
    next(error);
  }
});

recordsRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await prisma.management.findUnique({
      where: { id: req.params.id },
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
    const context = await ensureRecordContext(req.body);

    const row = await prisma.management.create({
      data: {
        ...context,
        ...managementCreateData(req.body),
      } as any,
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
    const previous = await prisma.management.findUnique({ where: { id: req.params.id } });
    if (!previous) return res.status(404).json({ message: "Registro no encontrado" });

    const patch = managementPatchData(req.body);
    const changedDescriptions = Object.entries(req.body || {})
      .filter(([key]) => key in fieldParsers || ["mandante_id", "group_id", "company_id", "line_id", "line_afp_id"].includes(key))
      .map(([key, newValue]) => `${key}: "${String((previous as any)[key] ?? "")}" → "${String(newValue ?? "")}"`);

    const row = await prisma.management.update({
      where: { id: req.params.id },
      data: patch as any,
      include: recordInclude,
    });

    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: row.id,
        management_id: row.id,
        activity_type: "EDICIÓN",
        status: "Completada",
        description: changedDescriptions.length
          ? `Campos modificados: ${changedDescriptions.join("; ")}`
          : "Registro actualizado desde ficha de detalle",
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

    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: recordId,
        management_id: recordId,
        activity_type: "NOTA",
        status: "Completada",
        description: "Nota agregada al registro",
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

recordsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);

    await prisma.$transaction([
      prisma.document.deleteMany({ where: { management_id: id } }),
      prisma.note.deleteMany({ where: { management_id: id } }),
      prisma.activity.deleteMany({ where: { management_id: id } }),
      prisma.management.delete({ where: { id } }),
    ]);

    res.json({ ok: true, deleted: 1 });
  } catch (error) {
    next(error);
  }
});

recordsRouter.delete("/", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ message: "No se recibieron registros para eliminar" });

    await prisma.$transaction([
      prisma.document.deleteMany({ where: { management_id: { in: ids } } }),
      prisma.note.deleteMany({ where: { management_id: { in: ids } } }),
      prisma.activity.deleteMany({ where: { management_id: { in: ids } } }),
      prisma.management.deleteMany({ where: { id: { in: ids } } }),
    ]);

    res.json({ ok: true, deleted: ids.length });
  } catch (error) {
    next(error);
  }
});


export default recordsRouter;
