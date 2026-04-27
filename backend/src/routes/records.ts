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

function isAutoLineValue(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  return (
    !raw ||
    raw === "auto" ||
    raw === "automatico" ||
    raw === "automático" ||
    raw === "crear_auto" ||
    raw === "crear-automaticamente" ||
    raw === "crear_automaticamente" ||
    raw.includes("crear automáticamente") ||
    raw.includes("crear automaticamente")
  );
}

function nullableId(value: unknown) {
  if (isAutoLineValue(value)) return null;
  const text = String(value ?? "").trim();
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidLike.test(text) ? text : null;
}

function sanitizeRecordBody(body: any) {
  const clean = { ...(body || {}) };

  if (hasOwn(clean, "line_afp_id")) clean.line_afp_id = nullableId(clean.line_afp_id);
  if (hasOwn(clean, "line_id")) clean.line_id = nullableId(clean.line_id);
  if (hasOwn(clean, "company_id")) clean.company_id = nullableId(clean.company_id);
  if (hasOwn(clean, "group_id")) clean.group_id = nullableId(clean.group_id);
  if (hasOwn(clean, "mandante_id")) clean.mandante_id = nullableId(clean.mandante_id);

  delete clean.afp_linea;
  delete clean.afpLinea;
  delete clean.linea_afp;
  delete clean.afp_linea_id;

  return clean;
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
    data[key] = parser(body[key]);
  }
  data.last_activity_at = new Date();
  return data;
}

function managementPatchData(body: any) {
  const data: Record<string, unknown> = {};
  for (const [key, parser] of Object.entries(fieldParsers)) {
    if (hasOwn(body, key)) data[key] = parser(body[key]);
  }

  if (hasOwn(body, "mandante_id")) data.mandante_id = nullableId(body.mandante_id);
  if (hasOwn(body, "group_id")) data.group_id = nullableId(body.group_id);
  if (hasOwn(body, "company_id")) data.company_id = nullableId(body.company_id);
  if (hasOwn(body, "line_id")) data.line_id = nullableId(body.line_id);
  if (hasOwn(body, "line_afp_id")) data.line_afp_id = nullableId(body.line_afp_id);

  data.last_activity_at = new Date();
  return data;
}



function normalizeLegacyRow(row: any, managementType: "LM" | "TP", body: any) {
  return {
    id: row.id,
    management_type: managementType,
    entidad: nullableString(body.entidad),
    rut: nullableString(body.rut),
    estado_gestion: nullableString(body.estado_gestion) || "Pendiente Gestión",
    monto_devolucion: nullableNumber(body.monto_devolucion),
    razon_social: nullableString(body.razon_social),
    numero_solicitud: nullableString(body.numero_solicitud),
    grupo_empresa: nullableString(body.grupo_empresa),
    confirmacion_cc: toBoolean(body.confirmacion_cc),
    confirmacion_poder: toBoolean(body.confirmacion_poder),
    banco: nullableString(body.banco),
    tipo_cuenta: nullableString(body.tipo_cuenta),
    numero_cuenta: nullableString(body.numero_cuenta),
    acceso_portal: nullableString(body.acceso_portal),
    motivo_tipo_exceso: nullableString(body.motivo_tipo_exceso),
    mes_produccion_2026: nullableString(body.mes_produccion_2026),
    mandante: body.mandante_name ? { name: nullableString(body.mandante_name) } : null,
    company: { razon_social: nullableString(body.razon_social), rut: nullableString(body.rut) },
    lineAfp: { afp_name: nullableString(body.entidad) },
    documents: [],
    notes: [],
    activities: [],
  };
}

async function getExistingColumns(tableName: "lm_records" | "tp_records" | "activities") {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
    tableName
  );
  return new Set(rows.map((row) => row.column_name));
}

async function insertDynamic(tableName: "lm_records" | "tp_records", candidateData: Record<string, unknown>) {
  const existingColumns = await getExistingColumns(tableName);
  const entries = Object.entries(candidateData).filter(([column, value]) => existingColumns.has(column) && value !== undefined);

  if (!entries.length) {
    throw new Error(`La tabla ${tableName} no tiene columnas compatibles para crear el registro.`);
  }

  const columns = entries.map(([column]) => `"${column}"`).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `insert into ${tableName} (${columns}) values (${placeholders}) returning id`,
    ...values
  );

  return rows[0];
}

async function createLegacyActivity(recordId: string) {
  try {
    const columns = await getExistingColumns("activities");
    if (!columns.has("related_module") || !columns.has("related_record_id")) return;

    const data: Record<string, unknown> = {
      related_module: "records",
      related_record_id: recordId,
      activity_type: "CREACIÓN",
      status: "Completada",
      description: "Registro de empresa creado en modo compatible Railway",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const entries = Object.entries(data).filter(([column]) => columns.has(column));
    const sqlColumns = entries.map(([column]) => `"${column}"`).join(", ");
    const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
    await prisma.$executeRawUnsafe(
      `insert into activities (${sqlColumns}) values (${placeholders})`,
      ...entries.map(([, value]) => value)
    );
  } catch (activityError) {
    console.warn("No se pudo crear actividad legacy:", activityError);
  }
}

async function createLegacyRecord(body: any) {
  const managementType: "LM" | "TP" = body.management_type === "TP" ? "TP" : "LM";
  const mandanteName = nullableString(body.mandante_name) || "Sin mandante";
  const rut = nullableString(body.rut) || `TEMP-${Date.now()}`;
  const razonSocial = nullableString(body.razon_social) || "Empresa sin razón social";
  const estadoGestion = nullableString(body.estado_gestion) || "Pendiente Gestión";
  const now = new Date();

  if (managementType === "TP") {
    const row = await insertDynamic("tp_records", {
      mandante: mandanteName,
      rut,
      entity: nullableString(body.entidad),
      business_name: razonSocial,
      management_status: estadoGestion,
      refund_amount: nullableNumber(body.monto_devolucion),
      request_number: nullableString(body.numero_solicitud),
      search_group: nullableString(body.grupo_empresa),
      bank_name: nullableString(body.banco),
      account_number: nullableString(body.numero_cuenta),
      account_type: nullableString(body.tipo_cuenta),
      portal_access: nullableString(body.acceso_portal),
      production_months: nullableString(body.mes_produccion_2026),
      comment: nullableString(body.comment) || `Registro TP creado desde Registros de empresas. RUT: ${rut}. Razón Social: ${razonSocial}. AFP/Entidad: ${nullableString(body.entidad) || ""}. Estado: ${estadoGestion}. Monto: ${nullableString(body.monto_devolucion) || ""}.`,
      client_contract_status: nullableString(body.estado_contrato_cliente),
      contract_end_date: nullableDate(body.fecha_termino_contrato),
      cen_content: nullableString(body.contenido_cen),
      cen_query: nullableString(body.consulta_cen),
      cen_response: nullableString(body.respuesta_cen),
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    });
    await createLegacyActivity(row.id);
    return normalizeLegacyRow(row, "TP", body);
  }

  const row = await insertDynamic("lm_records", {
    search_group: nullableString(body.grupo_empresa),
    rut,
    entity: nullableString(body.entidad),
    management_status: estadoGestion,
    refund_amount: nullableNumber(body.monto_devolucion),
    confirmation_cc: toBoolean(body.confirmacion_cc),
    confirmation_power: toBoolean(body.confirmacion_poder),
    actual_paid_amount: nullableNumber(body.monto_pagado),
    excess_type_reason: nullableString(body.motivo_tipo_exceso),
    worker_status: nullableString(body.estado_trabajador),
    request_number: nullableString(body.numero_solicitud),
    business_name: razonSocial,
    actual_finanfix_amount: nullableNumber(body.monto_real_finanfix_solutions),
    production_months: nullableString(body.mes_produccion_2026),
    invoice_number: nullableString(body.numero_factura),
    bank_name: nullableString(body.banco),
    account_number: nullableString(body.numero_cuenta),
    account_type: nullableString(body.tipo_cuenta),
    client_contract_status: nullableString(body.estado_contrato_cliente),
    fee: nullableNumber(body.fee),
    client_amount: nullableNumber(body.monto_cliente),
    finanfix_amount: nullableNumber(body.monto_finanfix_solutions),
    actual_client_amount: nullableNumber(body.monto_real_cliente),
    contract_end_date: nullableDate(body.fecha_termino_contrato),
    rejection_date: nullableDate(body.fecha_rechazo),
    comment: nullableString(body.comment),
    oc_number: nullableString(body.numero_oc),
    afp_shipment: nullableString(body.envio_afp),
    afp_entry_date: nullableDate(body.fecha_ingreso_afp),
    mandante: mandanteName,
    portal_access: nullableString(body.acceso_portal),
    cen_response: nullableString(body.respuesta_cen),
    cen_query: nullableString(body.consulta_cen),
    request_entry_month: nullableString(body.mes_ingreso_solicitud),
    cen_content: nullableString(body.contenido_cen),
    afp_payment_date: nullableDate(body.fecha_pago_afp),
    afp_submission_date: nullableDate(body.fecha_presentacion_afp),
    finanfix_invoice_date: nullableDate(body.fecha_factura_finanfix),
    finanfix_invoice_payment_date: nullableDate(body.fecha_pago_factura_finanfix),
    client_notification_date: nullableDate(body.fecha_notificacion_cliente),
    last_activity_at: now,
    created_at: now,
    updated_at: now,
  });

  await createLegacyActivity(row.id);
  return normalizeLegacyRow(row, "LM", body);
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
  const requestedAfpId = nullableId(body.line_afp_id);

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
  const requestedMandanteId = nullableId(body.mandante_id);
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
    const mandanteId =
      typeof req.query.mandante_id === "string"
        ? req.query.mandante_id
        : undefined;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const where: any = {};

    // 🔥 SOLO agregamos si existe (clave)
    if (mandanteId) {
      where.mandante_id = mandanteId;
    }

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

    try {
      const rows = await prisma.management.findMany({
        where,
        include: { mandante: true, group: true, company: true, line: true, lineAfp: true, documents: true },
        orderBy: { created_at: "desc" },
      });
      return res.json(rows);
    } catch (managementError: any) {
      console.error("ERROR /api/records usando managements:", managementError?.message || managementError);
      const [lmRows, tpRows] = await Promise.all([
        prisma.lmRecord.findMany({ orderBy: { created_at: "desc" }, take: 500 }),
        prisma.tpRecord.findMany({ orderBy: { created_at: "desc" }, take: 500 }),
      ]);
      const legacyRows = [
        ...lmRows.map((row: any) => ({ id: row.management_id || row.id, management_type: "LM", entidad: row.entity, rut: row.rut, estado_gestion: row.management_status, monto_devolucion: row.refund_amount, razon_social: row.business_name, numero_solicitud: row.request_number, grupo_empresa: row.search_group, confirmacion_cc: row.confirmation_cc, confirmacion_poder: row.confirmation_power, banco: row.bank_name, tipo_cuenta: row.account_type, numero_cuenta: row.account_number, acceso_portal: row.portal_access, motivo_tipo_exceso: row.motivo_tipo_exceso || row.excess_type_reason, mes_produccion_2026: row.mes_produccion_2026, mandante: row.mandante ? { name: row.mandante } : null, company: { razon_social: row.business_name, rut: row.rut }, lineAfp: { afp_name: row.entity }, documents: [] })),
        ...tpRows.map((row: any) => ({ id: row.management_id || row.id, management_type: "TP", entidad: row.entity, rut: row.rut, estado_gestion: row.management_status, monto_devolucion: row.refund_amount, razon_social: row.business_name, numero_solicitud: row.request_number, grupo_empresa: row.search_group, banco: row.bank_name, tipo_cuenta: row.account_type, numero_cuenta: row.account_number, acceso_portal: row.acceso_portal || row.portal_access, mes_produccion_2026: row.mes_produccion_2026, mandante: row.mandante ? { name: row.mandante } : null, company: { razon_social: row.business_name, rut: row.rut }, lineAfp: { afp_name: row.entity }, documents: [] })),
      ];
      return res.json(legacyRows);
    }
  } catch (error: any) {
    console.error("ERROR FINAL /api/records:", error?.message || error);
    res.status(500).json({ message: "No se pudieron cargar los registros de empresas.", detail: process.env.NODE_ENV === "production" ? undefined : String(error?.message || error) });
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
    const body = sanitizeRecordBody(req.body);

    try {
      const context = await ensureRecordContext(body);

      const row = await prisma.management.create({
        data: {
          ...context,
          ...managementCreateData(body),
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

      return res.status(201).json(row);
    } catch (managementError: any) {
      console.error("ERROR /api/records POST usando managements. Se usará modo compatible:", managementError?.message || managementError);
      const legacyRow = await createLegacyRecord(body);
      return res.status(201).json(legacyRow);
    }
  } catch (error) {
    next(error);
  }
});

recordsRouter.put("/:id", async (req, res, next) => {
  try {
    const body = sanitizeRecordBody(req.body);
    const previous = await prisma.management.findUnique({ where: { id: req.params.id } });
    if (!previous) return res.status(404).json({ message: "Registro no encontrado" });

    const patch = managementPatchData(body);
    const changedDescriptions = Object.entries(body || {})
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

export default recordsRouter;
