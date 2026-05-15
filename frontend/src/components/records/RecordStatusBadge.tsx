import type { RecordItem } from "../../types-records";

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getRecordStatusTone(status: unknown) {
  const value = normalize(status);

  if (!value) return "neutral";
  if (value.includes("pag") || value.includes("cerr") || value.includes("factur")) return "success";
  if (value.includes("rechaz") || value.includes("anulad")) return "danger";
  if (value.includes("enviado") || value.includes("respond")) return "info";
  if (value.includes("prepar")) return "warning";
  if (value.includes("pend")) return "pending";
  if (value.includes("gestionado")) return "success";

  return "neutral";
}

export default function RecordStatusBadge({ status }: { status?: RecordItem["estado_gestion"] | string | null }) {
  const tone = getRecordStatusTone(status);

  return (
    <span className={`record-status-badge tone-${tone}`}>
      {status || "Sin estado"}
    </span>
  );
}
