import type { RecordItem } from "../../types-records";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value;

  const text = normalizeText(value);

  return (
    text === "true" ||
    text === "si" ||
    text === "sí" ||
    text === "1" ||
    text === "confirmado" ||
    text === "confirmada"
  );
}

function toMoneyNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value ?? "")
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isRecordReadyToManage(record: RecordItem) {
  const row: any = record;
  const hasPower = toBool(row.confirmacion_poder ?? row.confirmation_power);
  const hasCc = toBool(row.confirmacion_cc ?? row.confirmation_cc);
  const amount = toMoneyNumber(row.monto_devolucion ?? row.refund_amount);
  const status = normalizeText(row.estado_gestion ?? row.management_status);

  return hasPower && hasCc && amount > 0 && status.includes("pendiente");
}

export function getRecordPriority(row: RecordItem) {
  const record: any = row;
  const refund = toMoneyNumber(record.monto_devolucion ?? record.refund_amount);
  const hasCc = toBool(record.confirmacion_cc ?? record.confirmation_cc);
  const hasPower = toBool(record.confirmacion_poder ?? record.confirmation_power);
  const status = normalizeText(record.estado_gestion ?? record.management_status);
  const ready = isRecordReadyToManage(row);

  if (ready && refund >= 1000000) return { label: "Alta", tone: "high", score: 100 };
  if (ready) return { label: "Media", tone: "medium", score: 75 };
  if (!hasPower) return { label: "Falta poder", tone: "blocked", score: 20 };
  if (!hasCc) return { label: "Falta CC", tone: "blocked", score: 25 };
  if (refund <= 0) return { label: "Sin monto", tone: "low", score: 10 };
  if (!status.includes("pendiente")) return { label: "No pendiente", tone: "low", score: 30 };

  return { label: "No listo", tone: "low", score: 35 };
}

export default function RecordPriorityBadge({ row }: { row: RecordItem }) {
  const priority = getRecordPriority(row);

  return (
    <span
      className={`record-priority-badge tone-${priority.tone}`}
      title={`Score operacional: ${priority.score}. Listo para gestionar exige poder = Sí, CC = Sí, monto > 0 y estado pendiente.`}
    >
      {priority.label}
    </span>
  );
}
