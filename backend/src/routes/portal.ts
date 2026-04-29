import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

const portalRouter = Router();

function getSession(req: any) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try { return jwt.verify(token, env.jwtSecret) as any; } catch { return null; }
}

function normalizeRow(row: any, type: "LM" | "TP") {
  return {
    id: row.management_id || row.id,
    source_id: row.id,
    management_type: type,
    mandante_id: row.mandante_id || null,
    mandante: row.mandante_rel ? { id: row.mandante_rel.id, name: row.mandante_rel.name } : (row.mandante ? { id: row.mandante_id || "", name: row.mandante } : null),
    razon_social: row.business_name || row.company_rel?.razon_social || null,
    rut: row.rut || row.company_rel?.rut || null,
    entidad: row.entity || row.line_afp_rel?.afp_name || null,
    estado_gestion: row.management_status || null,
    monto_devolucion: row.refund_amount || 0,
    numero_solicitud: row.request_number || null,
    grupo_empresa: row.search_group || null,
    confirmacion_cc: row.confirmation_cc ?? false,
    confirmacion_poder: row.confirmation_power ?? false,
    fecha_pago_afp: row.fecha_pago_afp || null,
    motivo_tipo_exceso: row.motivo_tipo_exceso || row.excess_type_reason || type,
    documents: [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

portalRouter.get("/records", async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ message: "Debes iniciar sesión." });
  const role = String(session.role || "").toLowerCase();
  const whereLm: any = {};
  const whereTp: any = {};
  if (role === "cliente") {
    if (session.mandante_id) {
      whereLm.OR = [{ mandante_id: session.mandante_id }, { mandante: session.mandante_name || "" }];
      whereTp.OR = [{ mandante_id: session.mandante_id }, { mandante: session.mandante_name || "" }];
    } else if (session.mandante_name) {
      whereLm.mandante = session.mandante_name;
      whereTp.mandante = session.mandante_name;
    } else {
      return res.json([]);
    }
  }
  const [lm, tp] = await Promise.all([
    prisma.lmRecord.findMany({ where: whereLm, include: { mandante_rel: true, company_rel: true, line_afp_rel: true }, orderBy: { created_at: "desc" }, take: 2000 }),
    prisma.tpRecord.findMany({ where: whereTp, include: { mandante_rel: true, company_rel: true, line_afp_rel: true }, orderBy: { created_at: "desc" }, take: 2000 }),
  ]);
  res.json([...lm.map((r: any) => normalizeRow(r, "LM")), ...tp.map((r: any) => normalizeRow(r, "TP"))]);
});

export default portalRouter;
