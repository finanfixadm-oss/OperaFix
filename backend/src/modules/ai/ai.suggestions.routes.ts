import express from "express";
import { DocumentCategory, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

type Checklist = {
  tieneMonto: boolean;
  tieneCC: boolean;
  tienePoder: boolean;
  tieneEntidad: boolean;
  estaPendiente: boolean;
  tieneDetalle: boolean;
  tieneArchivoGestion: boolean;
};

type Suggestion = {
  id: string;
  management_id: string | null;
  mandante: string;
  business_name: string;
  rut: string;
  request_number: string;
  refund_amount: number;
  management_status: string;
  entity: string;
  confirmation_cc: boolean;
  confirmation_power: boolean;
  document_count: number;
  document_categories: string[];
  checklist: Checklist;
  score: number;
  suggestedAction: string;
  suggestedData: Record<string, unknown>;
  reason: string;
  nextSteps: string[];
};

const isYes = (value: unknown): boolean => value === true || String(value || "").toLowerCase() === "si" || String(value || "").toLowerCase() === "sí";
const moneyNumber = (value: unknown): number => Number(value || 0);
const normalize = (value: unknown): string => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const usefulDetailCategories = new Set<string>([
  DocumentCategory.DETALLE_TRABAJADORES,
  DocumentCategory.ARCHIVO_GESTION,
  DocumentCategory.ARCHIVO_AFP,
  DocumentCategory.CARTA_EXPLICATIVA,
  DocumentCategory.COMPROBANTE_PAGO,
]);

const isPendingStatus = (status: string): boolean => {
  const s = normalize(status);
  return s.includes("pendiente") || s.includes("sin gestion") || s.includes("por gestionar");
};

const isAssignedEntity = (entity: string): boolean => {
  const e = normalize(entity);
  return Boolean(e) && !e.includes("pendiente") && !e.includes("sin entidad") && !e.includes("asignacion");
};

router.get("/suggestions", async (_req, res) => {
  try {
    const records = await prisma.lmRecord.findMany({
      take: 1000,
      orderBy: {
        refund_amount: "desc",
      },
      select: {
        id: true,
        management_id: true,
        mandante: true,
        business_name: true,
        rut: true,
        request_number: true,
        refund_amount: true,
        management_status: true,
        entity: true,
        confirmation_cc: true,
        confirmation_power: true,
        fecha_presentacion_afp: true,
        fecha_ingreso_afp: true,
        fecha_pago_afp: true,
      },
    });

    const ids = records.map((record) => record.id);
    const managementIds = records.map((record) => record.management_id).filter((id): id is string => Boolean(id));

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { related_record_id: { in: ids } },
          { management_id: { in: managementIds } },
        ],
      },
      select: {
        related_record_id: true,
        management_id: true,
        category: true,
        file_name: true,
      },
    });

    const docsByKey = new Map<string, typeof documents>();

    for (const doc of documents) {
      const keys = [doc.related_record_id, doc.management_id].filter(Boolean) as string[];
      for (const key of keys) {
        if (!docsByKey.has(key)) docsByKey.set(key, []);
        docsByKey.get(key)?.push(doc);
      }
    }

    const suggestions: Suggestion[] = records
      .map((record) => {
        const docs = [
          ...(docsByKey.get(record.id) || []),
          ...(record.management_id ? docsByKey.get(record.management_id) || [] : []),
        ];

        const documentCategories = [...new Set(docs.map((doc) => String(doc.category)))];
        const refundAmount = moneyNumber(record.refund_amount);
        const status = String(record.management_status || "");
        const entity = String(record.entity || "");
        const hasDetail = documentCategories.some((category) => usefulDetailCategories.has(category));
        const hasGestionFile = documentCategories.includes(DocumentCategory.ARCHIVO_GESTION) || documentCategories.includes(DocumentCategory.ARCHIVO_AFP);

        const checklist: Checklist = {
          tieneMonto: refundAmount > 0,
          tieneCC: isYes(record.confirmation_cc),
          tienePoder: isYes(record.confirmation_power),
          tieneEntidad: isAssignedEntity(entity),
          estaPendiente: isPendingStatus(status),
          tieneDetalle: hasDetail,
          tieneArchivoGestion: hasGestionFile,
        };

        const readyCount = Object.values(checklist).filter(Boolean).length;
        const allCriticalReady = checklist.tieneMonto && checklist.tieneCC && checklist.tienePoder && checklist.tieneEntidad && checklist.estaPendiente && checklist.tieneDetalle;

        let score = refundAmount * 0.6;
        score += checklist.tieneCC ? 250000 : 0;
        score += checklist.tienePoder ? 250000 : 0;
        score += checklist.tieneDetalle ? 200000 : 0;
        score += checklist.tieneArchivoGestion ? 100000 : 0;
        score += checklist.tieneEntidad ? 100000 : 0;
        score += checklist.estaPendiente ? 100000 : 0;
        score += readyCount * 10000;

        const missing = Object.entries(checklist)
          .filter(([, ok]) => !ok)
          .map(([key]) => key);

        const reason = allCriticalReady
          ? "Caso listo para gestionar: tiene monto, CC confirmada, poder confirmado, AFP asignada y documentación/detalle cargado."
          : `Caso con avance parcial. Faltan condiciones para gestionarlo sin fricción: ${missing.join(", ")}.`;

        const nextSteps = allCriticalReady
          ? [
              "Revisar detalle cargado en la línea.",
              "Preparar presentación o seguimiento ante AFP/entidad.",
              "Validar fechas de presentación/ingreso antes de contactar.",
            ]
          : [
              "Completar condiciones faltantes antes de gestionar.",
              "Validar CC, poder y documentación del caso.",
            ];

        return {
          id: record.id,
          management_id: record.management_id,
          mandante: String(record.mandante || "Sin mandante"),
          business_name: String(record.business_name || "Sin razón social"),
          rut: String(record.rut || ""),
          request_number: String(record.request_number || ""),
          refund_amount: refundAmount,
          management_status: status || "Sin estado",
          entity: entity || "Sin entidad",
          confirmation_cc: Boolean(record.confirmation_cc),
          confirmation_power: Boolean(record.confirmation_power),
          document_count: docs.length,
          document_categories: documentCategories,
          checklist,
          score,
          suggestedAction: allCriticalReady ? "Gestionar caso listo" : "Completar antecedentes antes de gestionar",
          suggestedData: {},
          reason,
          nextSteps,
        };
      })
      .filter((item) => item.suggestedAction === "Gestionar caso listo")
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    res.json({
      success: true,
      total: suggestions.length,
      criteria: {
        required: ["Monto > 0", "Confirmación CC = Sí", "Confirmación Poder = Sí", "AFP/Entidad asignada", "Estado pendiente", "Detalle o archivo cargado"],
        sourceFields: ["refund_amount", "confirmation_cc", "confirmation_power", "entity", "management_status", "documents"],
      },
      suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Error generando sugerencias IA",
    });
  }
});

export default router;
