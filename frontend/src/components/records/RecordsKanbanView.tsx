import type { RecordItem } from "../../types-records";
import { formatMoney } from "../../utils-record-fields";
import RecordPriorityBadge from "./RecordPriorityBadge";
import RecordStatusBadge from "./RecordStatusBadge";

function normalizeStatus(value: unknown) {
  const text = String(value || "Sin estado").trim();
  if (!text) return "Sin estado";
  return text;
}

function columnKey(status: unknown) {
  const value = normalizeStatus(status).toLowerCase();
  if (value.includes("pend")) return "Pendiente Gestión";
  if (value.includes("prepar")) return "En preparación";
  if (value.includes("envi")) return "Enviado AFP";
  if (value.includes("respond")) return "Respondido AFP";
  if (value.includes("pag")) return "Pagado";
  if (value.includes("factur")) return "Facturado";
  if (value.includes("rechaz")) return "Rechazado";
  if (value.includes("cerr")) return "Cerrado";
  return normalizeStatus(status);
}

const defaultColumns = [
  "Pendiente Gestión",
  "En preparación",
  "Enviado AFP",
  "Respondido AFP",
  "Pagado",
  "Facturado",
  "Rechazado",
  "Cerrado",
];

export default function RecordsKanbanView({
  rows,
  onOpen,
}: {
  rows: RecordItem[];
  onOpen: (row: RecordItem) => void;
}) {
  const grouped = new Map<string, RecordItem[]>();

  rows.forEach((row) => {
    const key = columnKey(row.estado_gestion);
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  });

  const columns = Array.from(new Set([...defaultColumns, ...Array.from(grouped.keys())]));

  return (
    <div className="records-kanban-pro">
      {columns.map((column) => {
        const items = grouped.get(column) || [];
        const total = items.reduce((sum, row) => sum + Number(row.monto_devolucion || 0), 0);

        return (
          <section className="records-kanban-column" key={column}>
            <header>
              <div>
                <strong>{column}</strong>
                <span>{items.length} casos · {formatMoney(total)}</span>
              </div>
            </header>
            <div className="records-kanban-list">
              {items.slice(0, 80).map((row) => (
                <button className="records-kanban-card" key={row.id} onClick={() => onOpen(row)} type="button">
                  <div className="kanban-card-top">
                    <strong>{row.razon_social || row.company?.razon_social || "Empresa sin razón social"}</strong>
                    <RecordPriorityBadge row={row} />
                  </div>
                  <div className="kanban-card-meta">
                    <span>{row.rut || row.company?.rut || "Sin RUT"}</span>
                    <span>{row.entidad || row.lineAfp?.afp_name || "Sin AFP"}</span>
                  </div>
                  <div className="kanban-card-bottom">
                    <RecordStatusBadge status={row.estado_gestion} />
                    <strong>{formatMoney(row.monto_devolucion)}</strong>
                  </div>
                </button>
              ))}
              {items.length === 0 && <div className="kanban-empty">Sin casos</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
