import { Router } from "express";
import { prisma } from "../config/prisma.js";

const aiActionsRouter = Router();

type AiAction = {
  id?: string;
  type: "UPDATE_STATUS" | "ADD_NOTE" | "CREATE_TASK" | "MARK_CONFIRMATION" | "CREATE_EMAIL_DRAFT";
  recordId: string;
  label?: string;
  payload?: Record<string, any>;
};

function money(value: unknown) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function recordTitle(row: any) {
  return row.razon_social || row.company?.razon_social || "Sin razón social";
}

function compactRecord(row: any) {
  return {
    id: row.id,
    mandante: row.mandante?.name || "",
    razon_social: recordTitle(row),
    rut: row.rut || row.company?.rut || "",
    entidad: row.entidad || row.lineAfp?.afp_name || "",
    estado_gestion: row.estado_gestion || "",
    numero_solicitud: row.numero_solicitud || "",
    monto_devolucion: Number(row.monto_devolucion || 0),
    monto_cliente: Number(row.monto_cliente || 0),
    monto_finanfix: Number(row.monto_finanfix_solutions || 0),
    confirmacion_cc: row.confirmacion_cc,
    confirmacion_poder: row.confirmacion_poder,
    motivo_rechazo: row.motivo_rechazo || "",
    fecha_presentacion_afp: row.fecha_presentacion_afp,
    fecha_ingreso_afp: row.fecha_ingreso_afp,
    fecha_pago_afp: row.fecha_pago_afp,
    created_at: row.created_at,
    updated_at: row.updated_at,
    documentos: (row.documents || []).map((doc: any) => ({ id: doc.id, nombre: doc.file_name, categoria: doc.category })),
  };
}

async function loadRecords(mandanteId?: string | null, limit = 120) {
  const where: any = {};
  if (mandanteId) where.mandante_id = mandanteId;
  return prisma.management.findMany({
    where,
    take: Math.min(Math.max(limit, 10), 300),
    orderBy: { updated_at: "desc" },
    include: {
      mandante: true,
      company: true,
      lineAfp: true,
      documents: { orderBy: { created_at: "desc" } },
    },
  });
}

function buildLocalAnswer(prompt: string, records: any[]) {
  const q = prompt.toLowerCase();
  const total = records.length;
  const totalMonto = records.reduce((acc, r) => acc + Number(r.monto_devolucion || 0), 0);
  const pending = records.filter((r) => !/pagad|cerrad|rechaz/i.test(String(r.estado_gestion || "")));
  const high = [...records].sort((a, b) => Number(b.monto_devolucion || 0) - Number(a.monto_devolucion || 0)).slice(0, 8);
  const missingPower = records.filter((r) => !r.confirmacion_poder);
  const missingCc = records.filter((r) => !r.confirmacion_cc);

  const lines = [
    "Informe IA Operafix",
    "",
    `Gestiones analizadas: ${total}`,
    `Monto devolución total: ${money(totalMonto)}`,
    `Gestiones pendientes o abiertas: ${pending.length}`,
    `Sin confirmación de poder: ${missingPower.length}`,
    `Sin confirmación CC: ${missingCc.length}`,
    "",
    "Top gestiones por monto:",
    ...high.map((r, i) => `${i + 1}. ${recordTitle(r)} · ${r.rut || r.company?.rut || "Sin RUT"} · ${r.entidad || r.lineAfp?.afp_name || "Sin AFP"} · ${money(r.monto_devolucion)} · ${r.estado_gestion || "Sin estado"}`),
    "",
    "Recomendación:",
    "Priorizar gestiones de alto monto, sin poder/CC y aquellas presentadas ante AFP que no tienen respuesta reciente.",
  ];

  if (q.includes("correo")) {
    lines.push("", "Borrador sugerido:", "Estimados, junto con saludar, solicitamos actualización del estado de las gestiones indicadas y confirmación de recepción de antecedentes. Quedamos atentos a sus comentarios.");
  }

  return lines.join("\n");
}

function buildRuleActions(prompt: string, records: any[]): AiAction[] {
  const q = prompt.toLowerCase();
  const actions: AiAction[] = [];

  const selected = records
    .filter((r) => {
      if (q.includes("rechaz")) return /rechaz/i.test(text(r.estado_gestion));
      if (q.includes("pag")) return /pag/i.test(text(r.estado_gestion));
      if (q.includes("poder")) return !r.confirmacion_poder;
      if (q.includes("cc") || q.includes("cuenta")) return !r.confirmacion_cc;
      if (q.includes("afp modelo")) return /modelo/i.test(`${r.entidad} ${r.lineAfp?.afp_name}`);
      if (q.includes("afp capital")) return /capital/i.test(`${r.entidad} ${r.lineAfp?.afp_name}`);
      return Number(r.monto_devolucion || 0) >= 500000 || !r.confirmacion_poder || !r.confirmacion_cc;
    })
    .slice(0, 8);

  for (const r of selected) {
    if (!r.confirmacion_poder) {
      actions.push({
        type: "CREATE_TASK",
        recordId: r.id,
        label: `Crear tarea: solicitar poder para ${recordTitle(r)}`,
        payload: { title: "Solicitar poder", description: `Solicitar/validar poder para ${recordTitle(r)} (${r.rut || r.company?.rut || "Sin RUT"}).` },
      });
    }
    if (!r.confirmacion_cc) {
      actions.push({
        type: "CREATE_TASK",
        recordId: r.id,
        label: `Crear tarea: validar cuenta corriente para ${recordTitle(r)}`,
        payload: { title: "Validar CC", description: `Validar datos bancarios para ${recordTitle(r)} antes de pago/devolución.` },
      });
    }
    if (/ingreso|present|enviad/i.test(text(r.estado_gestion))) {
      actions.push({
        type: "ADD_NOTE",
        recordId: r.id,
        label: `Agregar nota de seguimiento a ${recordTitle(r)}`,
        payload: { content: "IA sugiere seguimiento con entidad por gestión ingresada/presentada sin cierre visible." },
      });
    }
    if (q.includes("cambiar") && q.includes("seguimiento")) {
      actions.push({
        type: "UPDATE_STATUS",
        recordId: r.id,
        label: `Cambiar estado a Seguimiento entidad: ${recordTitle(r)}`,
        payload: { estado_gestion: "Seguimiento entidad" },
      });
    }
    actions.push({
      type: "CREATE_EMAIL_DRAFT",
      recordId: r.id,
      label: `Preparar borrador de correo para ${recordTitle(r)}`,
      payload: {
        subject: `Seguimiento gestión ${r.numero_solicitud || r.rut || ""}`.trim(),
        body: `Estimados, junto con saludar, solicitamos actualización de la gestión asociada a ${recordTitle(r)}, RUT ${r.rut || r.company?.rut || ""}, entidad ${r.entidad || r.lineAfp?.afp_name || ""}. Quedamos atentos.`,
      },
    });
  }

  return actions.slice(0, 12).map((action, index) => ({ ...action, id: `${action.type}-${action.recordId}-${index}` }));
}

async function callOpenAI(prompt: string, records: any[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const compact = records.map(compactRecord).slice(0, 80);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Eres la IA operativa de Operafix/Finanfix. Analiza gestiones de recuperación LM/TP. Responde en español de Chile, con foco ejecutivo, operativo y accionable. No inventes datos: usa solo el contexto entregado. Si recomiendas acciones, hazlas concretas.",
        },
        { role: "user", content: `Pregunta: ${prompt}\n\nRegistros disponibles en JSON:\n${JSON.stringify(compact)}` },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${detail}`);
  }

  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

async function createActivity(recordId: string, type: string, status: string, description: string) {
  try {
    await prisma.activity.create({
      data: {
        related_module: "records",
        related_record_id: recordId,
        management_id: recordId,
        activity_type: type,
        status,
        description,
      },
    });
  } catch (error) {
    console.warn("No se pudo registrar actividad IA:", error);
  }
}

aiActionsRouter.post("/chat", async (req, res) => {
  try {
    const prompt = text(req.body?.message || req.body?.prompt).trim();
    const mandanteId = text(req.body?.mandante_id || req.body?.mandanteId).trim() || null;
    if (!prompt) return res.status(400).json({ message: "Debes enviar una pregunta para la IA." });

    const records = await loadRecords(mandanteId, 160);
    let answer: string | null = null;
    let source: "openai" | "local" = "local";

    try {
      answer = await callOpenAI(prompt, records);
      if (answer) source = "openai";
    } catch (aiError: any) {
      console.warn("IA externa no disponible, se usa análisis local:", aiError?.message || aiError);
    }

    if (!answer) answer = buildLocalAnswer(prompt, records);
    const actions = buildRuleActions(prompt, records);

    return res.json({
      answer,
      actions,
      source,
      analyzed_records: records.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("ERROR /api/ai/chat:", error?.message || error);
    return res.status(500).json({ message: "No se pudo procesar la solicitud de IA.", detail: String(error?.message || error) });
  }
});

aiActionsRouter.post("/execute", async (req, res) => {
  try {
    const action = req.body?.action as AiAction;
    const confirmed = req.body?.confirmed === true;
    if (!confirmed) return res.status(400).json({ message: "La acción requiere confirmación explícita." });
    if (!action?.recordId || !action?.type) return res.status(400).json({ message: "Acción inválida." });

    const recordId = String(action.recordId);
    const payload = action.payload || {};

    if (action.type === "UPDATE_STATUS") {
      const nextStatus = text(payload.estado_gestion || payload.status).trim();
      if (!nextStatus) return res.status(400).json({ message: "Falta estado_gestion." });
      const updated = await prisma.management.update({ where: { id: recordId }, data: { estado_gestion: nextStatus, last_activity_at: new Date() } });
      await createActivity(recordId, "IA_ACCIÓN", "Completada", `IA cambió Estado Gestión a: ${nextStatus}`);
      return res.json({ ok: true, message: "Estado actualizado por IA.", record: updated });
    }

    if (action.type === "ADD_NOTE") {
      const content = text(payload.content || payload.note || "Nota creada por IA.");
      const note = await prisma.note.create({ data: { related_module: "records", related_record_id: recordId, management_id: recordId, content } });
      await createActivity(recordId, "IA_NOTA", "Completada", `IA agregó nota: ${content}`);
      return res.json({ ok: true, message: "Nota agregada por IA.", note });
    }

    if (action.type === "CREATE_TASK") {
      const title = text(payload.title || "Tarea sugerida por IA");
      const description = text(payload.description || action.label || "Acción sugerida por IA.");
      const due = payload.due_date ? new Date(payload.due_date) : null;
      const activity = await prisma.activity.create({
        data: {
          related_module: "records",
          related_record_id: recordId,
          management_id: recordId,
          activity_type: "TAREA_IA",
          status: "Pendiente",
          description: `${title}: ${description}`,
          due_date: due && !Number.isNaN(due.getTime()) ? due : null,
        },
      });
      return res.json({ ok: true, message: "Tarea creada por IA.", activity });
    }

    if (action.type === "MARK_CONFIRMATION") {
      const data: any = {};
      if (typeof payload.confirmacion_cc === "boolean") data.confirmacion_cc = payload.confirmacion_cc;
      if (typeof payload.confirmacion_poder === "boolean") data.confirmacion_poder = payload.confirmacion_poder;
      if (!Object.keys(data).length) return res.status(400).json({ message: "No hay confirmación válida para actualizar." });
      data.last_activity_at = new Date();
      const updated = await prisma.management.update({ where: { id: recordId }, data });
      await createActivity(recordId, "IA_ACCIÓN", "Completada", `IA actualizó confirmaciones: ${JSON.stringify(data)}`);
      return res.json({ ok: true, message: "Confirmaciones actualizadas por IA.", record: updated });
    }

    if (action.type === "CREATE_EMAIL_DRAFT") {
      const subject = text(payload.subject || "Borrador generado por IA");
      const body = text(payload.body || "");
      const activity = await prisma.activity.create({
        data: {
          related_module: "records",
          related_record_id: recordId,
          management_id: recordId,
          activity_type: "BORRADOR_CORREO_IA",
          status: "Borrador",
          description: `Asunto: ${subject}\n\n${body}`,
        },
      });
      return res.json({ ok: true, message: "Borrador de correo registrado en cronología.", activity });
    }

    return res.status(400).json({ message: "Tipo de acción IA no soportado." });
  } catch (error: any) {
    console.error("ERROR /api/ai/execute:", error?.message || error);
    return res.status(500).json({ message: "No se pudo ejecutar la acción IA.", detail: String(error?.message || error) });
  }
});

export default aiActionsRouter;
