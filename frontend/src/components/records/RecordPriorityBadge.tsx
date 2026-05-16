import type { RecordItem } from "../../types-records";

function amount(value: unknown) {
  const n = Number(String(value ?? 0).replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function daysSince(value?: string | null) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

export function getRecordPriority(row: RecordItem) {
  const refund = amount(row.monto_devolucion);
  const hasCc = row.confirmacion_cc === true;
  const hasPower = row.confirmacion_poder === true;
  const status = String(row.estado_gestion || "").toLowerCase();
  const age = daysSince(row.last_activity_at || row.updated_at || row.created_at);

  let score = 0;
  if (refund >= 1000000) score += 35;
  else if (refund >= 500000) score += 22;
  else if (refund > 0) score += 10;
  if (hasCc) score += 20;
  if (hasPower) score += 20;
  if (String(row.entidad || row.lineAfp?.afp_name || "").trim()) score += 10;
  if (status.includes("pend")) score += 10;
  if (age > 30) score -= 12;
  if (status.includes("rechaz")) score -= 25;
  if (status.includes("pag") || status.includes("cerr")) score -= 20;

  if (score >= 70) return { label: "Alta", tone: "high", score };
  if (score >= 40) return { label: "Media", tone: "medium", score };
  return { label: "Baja", tone: "low", score };
}

export default function RecordPriorityBadge({ row }: { row: RecordItem }) {
  const priority = getRecordPriority(row);

  return (
    <span className={`record-priority-badge tone-${priority.tone}`} title={`Score operacional: ${priority.score}`}>
      {priority.label}
    </span>
  );
}
