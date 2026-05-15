export type RecordQuickFilterKey =
  | "todos"
  | "listos"
  | "sin_poder"
  | "sin_cc"
  | "alto_monto"
  | "pendientes"
  | "pagados"
  | "rechazados"
  | "dormidos";

const filters: { key: RecordQuickFilterKey; label: string; hint: string }[] = [
  { key: "todos", label: "Todos", hint: "Mostrar todos los registros" },
  { key: "listos", label: "Listos para gestionar", hint: "CC sí, poder sí, monto y estado pendiente" },
  { key: "sin_poder", label: "Falta poder", hint: "Casos bloqueados por poder" },
  { key: "sin_cc", label: "Falta CC", hint: "Casos bloqueados por cuenta corriente" },
  { key: "alto_monto", label: "Alto monto", hint: "Monto devolución sobre $1.000.000" },
  { key: "pendientes", label: "Pendientes", hint: "Estados pendientes" },
  { key: "pagados", label: "Pagados / cerrados", hint: "Estados pagados o cerrados" },
  { key: "rechazados", label: "Rechazados", hint: "Estados o motivos de rechazo" },
  { key: "dormidos", label: "+30 días sin actividad", hint: "Casos antiguos sin movimiento" },
];

export default function RecordQuickFilters({
  value,
  onChange,
}: {
  value: RecordQuickFilterKey;
  onChange: (value: RecordQuickFilterKey) => void;
}) {
  return (
    <div className="record-quick-filters-pro">
      {filters.map((filter) => (
        <button
          key={filter.key}
          className={value === filter.key ? "active" : ""}
          onClick={() => onChange(filter.key)}
          title={filter.hint}
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
