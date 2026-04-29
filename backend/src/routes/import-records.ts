import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "../config/prisma.js";

const importRecordsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

type ManagementType = "LM" | "TP";

type NormalizedImportRow = {
  rowNumber: number;
  management_type: ManagementType;
  mandante: string | null;
  estado_contrato_cliente: string | null;
  motivo_tipo_exceso: string | null;
  entidad: string | null;
  envio_afp: string | null;
  estado_gestion: string | null;
  fecha_presentacion_afp: string | null;
  fecha_pago_afp: string | null;
  numero_solicitud: string | null;
  grupo_empresa: string | null;
  razon_social: string | null;
  rut: string | null;
  monto_devolucion: number | null;
  monto_pagado: number | null;
  monto_cliente: number | null;
  fee: number | null;
  monto_finanfix_solutions: number | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  confirmacion_cc: boolean;
  confirmacion_poder: boolean;
  acceso_portal: string | null;
  facturado_finanfix: string | null;
  facturado_cliente: string | null;
  fecha_factura_finanfix: string | null;
  fecha_pago_factura_finanfix: string | null;
  numero_factura: string | null;
  numero_oc: string | null;
  consulta_cen: string | null;
  contenido_cen: string | null;
  respuesta_cen: string | null;
  estado_trabajador: string | null;
  validation_status: "OK" | "ADVERTENCIA" | "ERROR";
  validation_messages: string[];
  duplicate_key: string;
  is_duplicate_in_file: boolean;
  exists_in_database: boolean;
};

type ImportSession = {
  id: string;
  createdAt: number;
  fileName: string;
  rows: NormalizedImportRow[];
  headers: string[];
};

const importSessions = new Map<string, ImportSession>();
const SESSION_TTL_MS = 1000 * 60 * 45;

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of importSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) importSessions.delete(id);
  }
}

const headerAliases: Record<string, keyof NormalizedImportRow> = {
  mandante: "mandante",
  "estado contrato con cliente": "estado_contrato_cliente",
  "motivo (tipo de exceso)": "motivo_tipo_exceso",
  motivo: "motivo_tipo_exceso",
  entidad: "entidad",
  afp: "entidad",
  "entidad / afp": "entidad",
  "envio afp": "envio_afp",
  "envío afp": "envio_afp",
  "estado gestion": "estado_gestion",
  "estado gestión": "estado_gestion",
  "fecha presentacion afp": "fecha_presentacion_afp",
  "fecha presentación afp": "fecha_presentacion_afp",
  "fecha pago afp": "fecha_pago_afp",
  "n solicitud": "numero_solicitud",
  "n° solicitud": "numero_solicitud",
  "numero solicitud": "numero_solicitud",
  "nro solicitud": "numero_solicitud",
  "grupo de empresa": "grupo_empresa",
  "buscar grupo": "grupo_empresa",
  "grupo empresa": "grupo_empresa",
  "razon social": "razon_social",
  "razón social": "razon_social",
  rut: "rut",
  "monto devolucion": "monto_devolucion",
  "monto devolución": "monto_devolucion",
  "monto pagado": "monto_pagado",
  "monto real pagado": "monto_pagado",
  "monto cliente": "monto_cliente",
  "monto  cliente": "monto_cliente",
  fee: "fee",
  "monto finanfix solutions": "monto_finanfix_solutions",
  "monto finanfix": "monto_finanfix_solutions",
  banco: "banco",
  "tipo de cuenta": "tipo_cuenta",
  "tipo cuenta": "tipo_cuenta",
  "numero cuenta": "numero_cuenta",
  "número cuenta": "numero_cuenta",
  "confirmacion cc": "confirmacion_cc",
  "confirmación cc": "confirmacion_cc",
  "confirmacion poder": "confirmacion_poder",
  "confirmación poder": "confirmacion_poder",
  "acceso portal": "acceso_portal",
  "facturado finanfix": "facturado_finanfix",
  "facturado cliente": "facturado_cliente",
  "fecha factura finanfix": "fecha_factura_finanfix",
  "fecha pago factura finanfix": "fecha_pago_factura_finanfix",
  "n factura": "numero_factura",
  "n° factura": "numero_factura",
  "n oc": "numero_oc",
  "n° oc": "numero_oc",
  "consulta cen": "consulta_cen",
  "contenido cen": "contenido_cen",
  "respuesta cen": "respuesta_cen",
  "estado trabajador": "estado_trabajador",
};

function normHeader(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function numberValue(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value)
    .replace(/\$/g, "")
    .replace(/CLP/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  return ["si", "sí", "true", "1", "x", "ok", "yes"].includes(text);
}

function excelDateToIso(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const text = String(value).trim();
  if (!text) return null;
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  const match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    const [, dd, mm, yy] = match;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    const parsed = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function rutValue(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  return text.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
}

function detectType(motivo: string | null): ManagementType {
  const text = (motivo || "").toLowerCase();
  if (text.includes("trabajo") || text.includes("tp")) return "TP";
  return "LM";
}

function makeKey(row: Pick<NormalizedImportRow, "mandante" | "rut" | "entidad" | "numero_solicitud" | "management_type">) {
  return [row.management_type, row.mandante || "", row.rut || "", row.entidad || "", row.numero_solicitud || ""]
    .join("|")
    .toUpperCase();
}

function validate(row: NormalizedImportRow) {
  const messages: string[] = [];
  if (!row.mandante) messages.push("Falta Mandante");
  if (!row.razon_social) messages.push("Falta Razón Social");
  if (!row.rut) messages.push("Falta RUT");
  if (!row.entidad && row.management_type === "LM") messages.push("Falta Entidad / AFP");
  if (row.monto_devolucion === null) messages.push("Monto Devolución vacío o inválido");
  if (row.rut && !/^\d{6,9}-?[0-9K]$/i.test(row.rut)) messages.push("RUT con formato no estándar");
  row.validation_messages = messages;
  row.validation_status = messages.some((m) => m.includes("Falta RUT") || m.includes("Falta Mandante") || m.includes("Falta Razón"))
    ? "ERROR"
    : messages.length
      ? "ADVERTENCIA"
      : "OK";
}

function normalizeRow(raw: any, rowNumber: number, headerMap: Record<string, keyof NormalizedImportRow>): NormalizedImportRow {
  const target: Record<string, unknown> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = headerMap[normHeader(header)];
    if (key) target[key] = value;
  }

  const motivo = stringValue(target.motivo_tipo_exceso);
  const row: NormalizedImportRow = {
    rowNumber,
    management_type: detectType(motivo),
    mandante: stringValue(target.mandante),
    estado_contrato_cliente: stringValue(target.estado_contrato_cliente),
    motivo_tipo_exceso: motivo,
    entidad: stringValue(target.entidad),
    envio_afp: stringValue(target.envio_afp),
    estado_gestion: stringValue(target.estado_gestion) || "Pendiente Gestión",
    fecha_presentacion_afp: excelDateToIso(target.fecha_presentacion_afp),
    fecha_pago_afp: excelDateToIso(target.fecha_pago_afp),
    numero_solicitud: stringValue(target.numero_solicitud),
    grupo_empresa: stringValue(target.grupo_empresa),
    razon_social: stringValue(target.razon_social),
    rut: rutValue(target.rut),
    monto_devolucion: numberValue(target.monto_devolucion),
    monto_pagado: numberValue(target.monto_pagado),
    monto_cliente: numberValue(target.monto_cliente),
    fee: numberValue(target.fee),
    monto_finanfix_solutions: numberValue(target.monto_finanfix_solutions),
    banco: stringValue(target.banco),
    tipo_cuenta: stringValue(target.tipo_cuenta),
    numero_cuenta: stringValue(target.numero_cuenta),
    confirmacion_cc: boolValue(target.confirmacion_cc),
    confirmacion_poder: boolValue(target.confirmacion_poder),
    acceso_portal: stringValue(target.acceso_portal),
    facturado_finanfix: stringValue(target.facturado_finanfix),
    facturado_cliente: stringValue(target.facturado_cliente),
    fecha_factura_finanfix: excelDateToIso(target.fecha_factura_finanfix),
    fecha_pago_factura_finanfix: excelDateToIso(target.fecha_pago_factura_finanfix),
    numero_factura: stringValue(target.numero_factura),
    numero_oc: stringValue(target.numero_oc),
    consulta_cen: stringValue(target.consulta_cen),
    contenido_cen: stringValue(target.contenido_cen),
    respuesta_cen: stringValue(target.respuesta_cen),
    estado_trabajador: stringValue(target.estado_trabajador),
    validation_status: "OK",
    validation_messages: [],
    duplicate_key: "",
    is_duplicate_in_file: false,
    exists_in_database: false,
  };
  row.duplicate_key = makeKey(row);
  validate(row);
  return row;
}

function parseWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("El Excel no tiene hojas para importar.");
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }) as Record<string, unknown>[];
  const headers = Object.keys(rawRows[0] || {});
  const headerMap: Record<string, keyof NormalizedImportRow> = {};
  for (const header of headers) {
    const alias = headerAliases[normHeader(header)];
    if (alias) headerMap[normHeader(header)] = alias;
  }
  const rows = rawRows.map((raw, index) => normalizeRow(raw, index + 2, headerMap));
  const seen = new Map<string, number>();
  for (const row of rows) {
    const count = seen.get(row.duplicate_key) || 0;
    seen.set(row.duplicate_key, count + 1);
    if (count > 0) {
      row.is_duplicate_in_file = true;
      row.validation_messages.push("Posible duplicado dentro del archivo");
      if (row.validation_status === "OK") row.validation_status = "ADVERTENCIA";
    }
  }
  return { sheetName, headers, rows };
}

async function markDatabaseDuplicates(rows: NormalizedImportRow[]) {
  const candidates = rows.filter((r) => r.rut || r.numero_solicitud);
  if (!candidates.length) return;
  const rutList = [...new Set(candidates.map((r) => r.rut).filter(Boolean))] as string[];
  const requestList = [...new Set(candidates.map((r) => r.numero_solicitud).filter(Boolean))] as string[];
  const [lm, tp] = await Promise.all([
    prisma.lmRecord.findMany({
      where: { OR: [{ rut: { in: rutList } }, { request_number: { in: requestList } }] },
      select: { rut: true, request_number: true, entity: true, mandante: true },
      take: 5000,
    }),
    prisma.tpRecord.findMany({
      where: { OR: [{ rut: { in: rutList } }, { request_number: { in: requestList } }] },
      select: { rut: true, request_number: true, entity: true, mandante: true },
      take: 5000,
    }),
  ]);
  const existing = new Set<string>();
  for (const row of lm) existing.add(makeKey({ management_type: "LM", mandante: row.mandante || null, rut: row.rut || null, entidad: row.entity || null, numero_solicitud: row.request_number || null }));
  for (const row of tp) existing.add(makeKey({ management_type: "TP", mandante: row.mandante || null, rut: row.rut || null, entidad: row.entity || null, numero_solicitud: row.request_number || null }));
  for (const row of rows) {
    if (existing.has(row.duplicate_key)) {
      row.exists_in_database = true;
      row.validation_messages.push("Posible duplicado en base de datos");
      if (row.validation_status === "OK") row.validation_status = "ADVERTENCIA";
    }
  }
}

function stats(rows: NormalizedImportRow[]) {
  const total = rows.length;
  const ok = rows.filter((r) => r.validation_status === "OK").length;
  const warnings = rows.filter((r) => r.validation_status === "ADVERTENCIA").length;
  const errors = rows.filter((r) => r.validation_status === "ERROR").length;
  const duplicatesInFile = rows.filter((r) => r.is_duplicate_in_file).length;
  const duplicatesInDb = rows.filter((r) => r.exists_in_database).length;
  const monto = rows.reduce((acc, r) => acc + (r.monto_devolucion || 0), 0);
  const byMandante = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.mandante || "Sin mandante";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byEstado = rows.reduce<Record<string, number>>((acc, r) => {
    const key = r.estado_gestion || "Sin estado";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return { total, ok, warnings, errors, duplicatesInFile, duplicatesInDb, monto, byMandante, byEstado };
}

async function buildAiReview(rows: NormalizedImportRow[], headers: string[]) {
  if (!process.env.OPENAI_API_KEY) {
    return "IA no ejecutada: falta OPENAI_API_KEY. La validación técnica sí fue realizada.";
  }
  try {
    const sample = rows.slice(0, 12).map((r) => ({
      fila: r.rowNumber,
      mandante: r.mandante,
      rut: r.rut,
      razon_social: r.razon_social,
      entidad: r.entidad,
      estado: r.estado_gestion,
      monto: r.monto_devolucion,
      validacion: r.validation_status,
      mensajes: r.validation_messages,
    }));
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        input: [
          {
            role: "system",
            content:
              "Eres un analista de carga masiva para un CRM de recuperaciones previsionales en Chile. Debes entregar una revisión breve, concreta y accionable. No inventes datos.",
          },
          {
            role: "user",
            content: JSON.stringify({ headers, stats: stats(rows), sample }, null, 2),
          },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${detail}`);
    }
    const data: any = await response.json();
    return data.output_text || data.output?.flatMap((item: any) => item.content || []).map((part: any) => part.text || "").join("\n") || "IA ejecutada sin observaciones adicionales.";
  } catch (error: any) {
    return `IA no disponible para esta revisión: ${error?.message || "error desconocido"}`;
  }
}

async function ensureContext(row: NormalizedImportRow) {
  const mandanteName = row.mandante || "Sin mandante";
  const mandante = await prisma.mandante.upsert({
    where: { name: mandanteName },
    update: {},
    create: { name: mandanteName },
  });
  const groupName = row.grupo_empresa || "Grupo general";
  const group = await prisma.companyGroup.upsert({
    where: { mandante_id_group_type_name: { mandante_id: mandante.id, group_type: row.management_type as any, name: groupName } },
    update: {},
    create: { mandante_id: mandante.id, group_type: row.management_type as any, name: groupName },
  });
  const rut = row.rut || `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const company = await prisma.company.upsert({
    where: { rut },
    update: { mandante_id: mandante.id, group_id: group.id, razon_social: row.razon_social || "Empresa sin razón social" },
    create: { mandante_id: mandante.id, group_id: group.id, rut, razon_social: row.razon_social || "Empresa sin razón social" },
  });
  let line = await prisma.managementLine.findFirst({
    where: { mandante_id: mandante.id, group_id: group.id, company_id: company.id, line_type: row.management_type as any },
  });
  if (!line) {
    line = await prisma.managementLine.create({
      data: { mandante_id: mandante.id, group_id: group.id, company_id: company.id, line_type: row.management_type as any, name: `${company.razon_social} - ${row.management_type}` },
    });
  }
  let lineAfp = null;
  if (row.entidad) {
    lineAfp = await prisma.managementLineAfp.upsert({
      where: { line_id_afp_name: { line_id: line.id, afp_name: row.entidad } },
      update: { current_status: row.estado_gestion || undefined },
      create: { line_id: line.id, afp_name: row.entidad, current_status: row.estado_gestion || "Pendiente Gestión" },
    });
  }
  return { mandante, group, company, line, lineAfp };
}

function dateOrNull(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function createManagement(row: NormalizedImportRow, context: Awaited<ReturnType<typeof ensureContext>>) {
  try {
    return await prisma.management.create({
      data: {
        mandante_id: context.mandante.id,
        group_id: context.group.id,
        company_id: context.company.id,
        line_id: context.line.id,
        line_afp_id: context.lineAfp?.id || null,
        management_type: row.management_type as any,
        estado_contrato_cliente: row.estado_contrato_cliente,
        motivo_tipo_exceso: row.motivo_tipo_exceso,
        entidad: row.entidad,
        envio_afp: row.envio_afp,
        estado_gestion: row.estado_gestion,
        fecha_presentacion_afp: dateOrNull(row.fecha_presentacion_afp),
        fecha_pago_afp: dateOrNull(row.fecha_pago_afp),
        numero_solicitud: row.numero_solicitud,
        grupo_empresa: row.grupo_empresa,
        razon_social: row.razon_social,
        rut: row.rut,
        monto_devolucion: row.monto_devolucion,
        monto_pagado: row.monto_pagado,
        monto_cliente: row.monto_cliente,
        fee: row.fee,
        monto_finanfix_solutions: row.monto_finanfix_solutions,
        banco: row.banco,
        tipo_cuenta: row.tipo_cuenta,
        numero_cuenta: row.numero_cuenta,
        confirmacion_cc: row.confirmacion_cc,
        confirmacion_poder: row.confirmacion_poder,
        acceso_portal: row.acceso_portal,
        facturado_finanfix: row.facturado_finanfix,
        facturado_cliente: row.facturado_cliente,
        fecha_factura_finanfix: dateOrNull(row.fecha_factura_finanfix),
        fecha_pago_factura_finanfix: dateOrNull(row.fecha_pago_factura_finanfix),
        numero_factura: row.numero_factura,
        numero_oc: row.numero_oc,
        consulta_cen: row.consulta_cen,
        contenido_cen: row.contenido_cen,
        respuesta_cen: row.respuesta_cen,
        estado_trabajador: row.estado_trabajador,
        last_activity_at: new Date(),
      } as any,
    });
  } catch (error) {
    return null;
  }
}

async function insertRow(row: NormalizedImportRow, skipDuplicates: boolean) {
  if (row.validation_status === "ERROR") return { status: "skipped", reason: "Fila con error crítico" };
  if (skipDuplicates && (row.is_duplicate_in_file || row.exists_in_database)) return { status: "skipped", reason: "Duplicado omitido" };

  const context = await ensureContext(row);
  const management = await createManagement(row, context);
  const baseData: any = {
    management_id: management?.id || null,
    mandante_id: context.mandante.id,
    company_id: context.company.id,
    line_id: context.line.id,
    line_afp_id: context.lineAfp?.id || null,
    search_group: row.grupo_empresa,
    rut: row.rut,
    entity: row.entidad,
    management_status: row.estado_gestion,
    refund_amount: row.monto_devolucion,
    actual_paid_amount: row.monto_pagado,
    request_number: row.numero_solicitud,
    business_name: row.razon_social,
    bank_name: row.banco,
    account_number: row.numero_cuenta,
    account_type: row.tipo_cuenta,
    comment: "Creado por carga masiva inteligente v53",
    mandante: row.mandante,
    portal_access: row.acceso_portal,
    estado_contrato_cliente: row.estado_contrato_cliente,
    fecha_termino_contrato: null,
    mes_produccion_2026: null,
    consulta_cen: row.consulta_cen,
    contenido_cen: row.contenido_cen,
    respuesta_cen: row.respuesta_cen,
    last_activity_at: new Date(),
  };

  if (row.management_type === "TP") {
    await prisma.tpRecord.create({ data: { ...baseData, worker_status: row.estado_trabajador } });
  } else {
    await prisma.lmRecord.create({
      data: {
        ...baseData,
        confirmation_cc: row.confirmacion_cc,
        confirmation_power: row.confirmacion_poder,
        excess_type_reason: row.motivo_tipo_exceso,
        worker_status: row.estado_trabajador,
        motivo_tipo_exceso: row.motivo_tipo_exceso,
        envio_afp: row.envio_afp,
        fecha_presentacion_afp: dateOrNull(row.fecha_presentacion_afp),
        fecha_pago_afp: dateOrNull(row.fecha_pago_afp),
        monto_cliente: row.monto_cliente,
        fee: row.fee,
        monto_finanfix_solutions: row.monto_finanfix_solutions,
        facturado_finanfix: row.facturado_finanfix,
        facturado_cliente: row.facturado_cliente,
        fecha_factura_finanfix: dateOrNull(row.fecha_factura_finanfix),
        fecha_pago_factura_finanfix: dateOrNull(row.fecha_pago_factura_finanfix),
        numero_factura: row.numero_factura,
        numero_oc: row.numero_oc,
      },
    });
  }

  if (management?.id) {
    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: management.id,
        management_id: management.id,
        activity_type: "CARGA MASIVA",
        status: "Completada",
        description: `Registro creado desde Excel. Fila ${row.rowNumber}. Mandante: ${row.mandante || "Sin mandante"}`,
      },
    }).catch(() => null);
  }

  return { status: "created", id: management?.id || null };
}

importRecordsRouter.post("/records/preview", upload.single("file"), async (req, res) => {
  cleanupSessions();
  try {
    if (!req.file) return res.status(400).json({ message: "Debes adjuntar un archivo Excel." });
    const parsed = parseWorkbook(req.file.buffer);
    await markDatabaseDuplicates(parsed.rows);
    const id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    importSessions.set(id, { id, createdAt: Date.now(), fileName: req.file.originalname, rows: parsed.rows, headers: parsed.headers });
    const aiReview = await buildAiReview(parsed.rows, parsed.headers);
    res.json({
      importId: id,
      fileName: req.file.originalname,
      sheetName: parsed.sheetName,
      headers: parsed.headers,
      stats: stats(parsed.rows),
      aiReview,
      rows: parsed.rows.slice(0, 100),
      totalRows: parsed.rows.length,
    });
  } catch (error: any) {
    console.error("Error preview carga masiva:", error);
    res.status(500).json({ message: "No se pudo procesar el Excel.", detail: error?.message || String(error) });
  }
});

importRecordsRouter.post("/records/commit", async (req, res) => {
  cleanupSessions();
  try {
    const importId = String(req.body.importId || "");
    const skipDuplicates = req.body.skipDuplicates !== false;
    const session = importSessions.get(importId);
    if (!session) return res.status(404).json({ message: "La vista previa expiró. Vuelve a cargar el archivo." });
    const results: any[] = [];
    for (const row of session.rows) {
      try {
        results.push(await insertRow(row, skipDuplicates));
      } catch (error: any) {
        results.push({ status: "error", rowNumber: row.rowNumber, reason: error?.message || String(error) });
      }
    }
    importSessions.delete(importId);
    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;
    res.json({ ok: errors === 0, created, skipped, errors, results: results.slice(0, 100) });
  } catch (error: any) {
    console.error("Error commit carga masiva:", error);
    res.status(500).json({ message: "No se pudo confirmar la carga masiva.", detail: error?.message || String(error) });
  }
});

export default importRecordsRouter;
