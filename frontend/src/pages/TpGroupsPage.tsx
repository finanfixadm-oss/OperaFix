import { useEffect, useState } from "react";
import { fetchJson } from "../api";
import type { PaginatedLmRecords, TpGroup } from "../types";
import DataTable from "../components/DataTable";

export default function TpGroupsPage() {
  const [rows, setRows] = useState<TpGroup[]>([]);
  const [mandantes, setMandantes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [mandante, setMandante] = useState("");

  useEffect(() => {
    fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=200").then((data) => setMandantes(data.filterOptions.mandantes || [])).catch(() => setMandantes([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (mandante) params.set("mandante", mandante);
    fetchJson<TpGroup[]>(`/tp-groups?${params.toString()}`).then(setRows).catch(() => setRows([]));
  }, [search, mandante]);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Trabajo Pesado</span>
          <h2 className="page-title">Grupos empresas - TP</h2>
        </div>
        <div className="toolbar-actions">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar grupo TP" className="toolbar-input" />
          <select value={mandante} onChange={(e) => setMandante(e.target.value)} className="toolbar-input">
            <option value="">Todos los mandantes</option>
            {mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <DataTable title="Grupos empresas - TP" columns={[{ key: "name", label: "Nombre grupo" }, { key: "email", label: "Correo" }, { key: "mandante", label: "Mandante" }, { key: "created_at", label: "Creación" }]} rows={rows as any} />
    </div>
  );
}
