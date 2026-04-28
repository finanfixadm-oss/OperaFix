import type { FilterFieldDefinition } from "./types";
import type { RecordItem } from "./types-records";

export type RecordColumnDefinition = FilterFieldDefinition & {
  defaultVisible?: boolean;
  width?: string;
  money?: boolean;
  value: (row: RecordItem) => unknown;
};

export function formatMoney(value?: number | string | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function boolLabel(value?: boolean | null) {
  if (value === undefined || value === null) return "—";
  return value ? "Sí" : "No";
}

export function formatCellValue(value: unknown, column?: RecordColumnDefinition) {
  if (column?.money) return formatMoney(value as any);
  if (typeof value === "boolean") return boolLabel(value);
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export function getValueByPath(obj: unknown, path: string) {
  return path.split(".").reduce<any>((acc, key) => acc?.[key], obj);
}

export const recordColumns: RecordColumnDefinition[] = [
  { field: "mandante.name", label: "Mandante", type: "text", defaultVisible: true, value: (r) => r.mandante?.name || (r as any).mandante || (r as any).mandante_name },
  { field: "entidad", label: "Entidad", type: "text", defaultVisible: true, value: (r) => r.entidad || r.lineAfp?.afp_name },
  { field: "grupo_empresa", label: "Buscar Grupo", type: "text", defaultVisible: true, value: (r) => r.grupo_empresa || r.group?.name },
  { field: "confirmacion_cc", label: "Confirmación CC", type: "boolean", defaultVisible: true, value: (r) => r.confirmacion_cc },
  { field: "rut", label: "RUT", type: "text", defaultVisible: true, value: (r) => r.rut || r.company?.rut },
  { field: "estado_gestion", label: "Estado Gestión", type: "text", defaultVisible: true, value: (r) => r.estado_gestion },
  { field: "monto_devolucion", label: "Monto Devolución", type: "number", defaultVisible: true, money: true, value: (r) => r.monto_devolucion },
  { field: "razon_social", label: "Razón Social", type: "text", defaultVisible: true, value: (r) => r.razon_social || r.company?.razon_social },
  { field: "numero_solicitud", label: "N° Solicitud", type: "text", defaultVisible: true, value: (r) => r.numero_solicitud },
  { field: "mes_produccion_2026", label: "Mes producción", type: "text", defaultVisible: true, value: (r) => r.mes_produccion_2026 },
  { field: "management_type", label: "Tipo", type: "select", options: [{ label: "LM", value: "LM" }, { label: "TP", value: "TP" }], value: (r) => r.management_type },
  { field: "owner_name", label: "Propietario", type: "text", value: (r) => r.owner_name },
  { field: "lineAfp.afp_name", label: "AFP asociada", type: "text", value: (r) => r.lineAfp?.afp_name },
  { field: "company.razon_social", label: "Empresa asociada", type: "text", value: (r) => r.company?.razon_social },
  { field: "group.name", label: "Grupo asociado", type: "text", value: (r) => r.group?.name },
  { field: "envio_afp", label: "Envío AFP", type: "text", value: (r) => r.envio_afp },
  { field: "estado_contrato_cliente", label: "Estado contrato cliente", type: "text", value: (r) => r.estado_contrato_cliente },
  { field: "fecha_termino_contrato", label: "Fecha término contrato", type: "date", value: (r) => r.fecha_termino_contrato },
  { field: "motivo_tipo_exceso", label: "Motivo / Tipo exceso", type: "text", value: (r) => r.motivo_tipo_exceso },
  { field: "mes_ingreso_solicitud", label: "Mes ingreso solicitud", type: "text", value: (r) => r.mes_ingreso_solicitud },
  { field: "direccion", label: "Dirección", type: "text", value: (r) => r.direccion },
  { field: "banco", label: "Banco", type: "text", value: (r) => r.banco },
  { field: "tipo_cuenta", label: "Tipo de Cuenta", type: "text", value: (r) => r.tipo_cuenta },
  { field: "numero_cuenta", label: "Número cuenta", type: "text", value: (r) => r.numero_cuenta },
  { field: "confirmacion_poder", label: "Confirmación Poder", type: "boolean", value: (r) => r.confirmacion_poder },
  { field: "acceso_portal", label: "Acceso portal", type: "text", value: (r) => r.acceso_portal },
  { field: "fecha_presentacion_afp", label: "Fecha presentación AFP", type: "date", value: (r) => r.fecha_presentacion_afp },
  { field: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date", value: (r) => r.fecha_ingreso_afp },
  { field: "fecha_pago_afp", label: "Fecha pago AFP", type: "date", value: (r) => r.fecha_pago_afp },
  { field: "estado_trabajador", label: "Estado Trabajador", type: "text", value: (r) => r.estado_trabajador },
  { field: "consulta_cen", label: "Consulta CEN", type: "text", value: (r) => r.consulta_cen },
  { field: "contenido_cen", label: "Contenido CEN", type: "text", value: (r) => r.contenido_cen },
  { field: "respuesta_cen", label: "Respuesta CEN", type: "text", value: (r) => r.respuesta_cen },
  { field: "fecha_rechazo", label: "Fecha rechazo", type: "date", value: (r) => r.fecha_rechazo },
  { field: "motivo_rechazo", label: "Motivo rechazo/anulación", type: "text", value: (r) => r.motivo_rechazo },
  { field: "monto_pagado", label: "Monto Real Pagado", type: "number", money: true, value: (r) => r.monto_pagado },
  { field: "monto_cliente", label: "Monto cliente", type: "number", money: true, value: (r) => r.monto_cliente },
  { field: "monto_finanfix_solutions", label: "Monto Finanfix", type: "number", money: true, value: (r) => r.monto_finanfix_solutions },
  { field: "monto_real_cliente", label: "Monto real cliente", type: "number", money: true, value: (r) => r.monto_real_cliente },
  { field: "monto_real_finanfix_solutions", label: "Monto real Finanfix", type: "number", money: true, value: (r) => r.monto_real_finanfix_solutions },
  { field: "fee", label: "FEE", type: "number", money: true, value: (r) => r.fee },
  { field: "facturado_finanfix", label: "Facturado Finanfix", type: "text", value: (r) => r.facturado_finanfix },
  { field: "facturado_cliente", label: "Facturado cliente", type: "text", value: (r) => r.facturado_cliente },
  { field: "fecha_factura_finanfix", label: "Fecha factura Finanfix", type: "date", value: (r) => r.fecha_factura_finanfix },
  { field: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date", value: (r) => r.fecha_pago_factura_finanfix },
  { field: "fecha_notificacion_cliente", label: "Fecha notificación cliente", type: "date", value: (r) => r.fecha_notificacion_cliente },
  { field: "numero_factura", label: "N° Factura", type: "text", value: (r) => r.numero_factura },
  { field: "numero_oc", label: "N° OC", type: "text", value: (r) => r.numero_oc },
  { field: "comment", label: "Comentario", type: "text", value: (r) => r.comment },
  { field: "documents", label: "Cantidad documentos", type: "number", value: (r) => r.documents?.length || 0 },
  { field: "created_at", label: "Fecha creación", type: "date", value: (r) => r.created_at },
  { field: "updated_at", label: "Fecha actualización", type: "date", value: (r) => r.updated_at },
  { field: "last_activity_at", label: "Última actividad", type: "date", value: (r) => r.last_activity_at },
];

export const recordFilterFields: FilterFieldDefinition[] = recordColumns.map(({ field, label, type, options }) => ({ field, label, type, options }));
export const defaultRecordColumnFields = recordColumns.filter((c) => c.defaultVisible).map((c) => c.field);
