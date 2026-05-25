import { useEffect, useRef, useState } from "react";
import type { RecordColumnDefinition } from "../../utils-record-fields";

type SortDirection = "asc" | "desc";

type Props = {
  column: RecordColumnDefinition;
  isPinned: boolean;
  sortDirection?: SortDirection;
  onSort: (direction: SortDirection) => void;
  onPin: () => void;
  onFilter: () => void;
  onHide: () => void;
};

export default function RecordColumnMenu({
  column,
  isPinned,
  sortDirection,
  onSort,
  onPin,
  onFilter,
  onHide,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function action(callback: () => void) {
    callback();
    setOpen(false);
  }

  return (
    <div className="record-column-menu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="record-column-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        title={`Opciones de columna: ${column.label}`}
      >
        ⋮
      </button>

      {open && (
        <div className="record-column-menu-popover">
          <div className="record-column-menu-title">{column.label}</div>

          <button
            type="button"
            className={sortDirection === "asc" ? "active" : ""}
            onClick={() => action(() => onSort("asc"))}
          >
            Ordenar A → Z / menor a mayor
          </button>

          <button
            type="button"
            className={sortDirection === "desc" ? "active" : ""}
            onClick={() => action(() => onSort("desc"))}
          >
            Ordenar Z → A / mayor a menor
          </button>

          <button type="button" onClick={() => action(onPin)}>
            {isPinned ? "Quitar fijado" : "Fijar columna"}
          </button>

          <button type="button" onClick={() => action(onFilter)}>
            Filtrar por esta columna
          </button>

          <button type="button" className="danger" onClick={() => action(onHide)}>
            Ocultar columna
          </button>
        </div>
      )}
    </div>
  );
}
