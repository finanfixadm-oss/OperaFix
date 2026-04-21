import { useEffect, useState } from "react";
import { fetchJson } from "../api";
import type { LmGroup, PaginatedLmRecords } from "../types";
import DataTable from "../components/DataTable";

export default function LmGroupsPage() {
  const [rows, setRows] = useState<LmGroup[]>([]);
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
    fetchJson<LmGroup[]>(`/lm-groups?${params.toString()}`).then(setRows).catch(() => setRows([]));
  }, [search, mandante]);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Gestiones LM - TP</span>
          <h2 className="page-title">Grupos de empresas - LM</h2>
        </div>
        <div className="toolbar-actions">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar grupo" className="toolbar-input" />
          <select value={mandante} onChange={(e) => setMandante(e.target.value)} className="toolbar-input">
            <option value="">Todos los mandantes</option>
            {mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <DataTable title="Grupos de empresas - LM" columns={[{ key: "name", label: "Nombre grupo" }, { key: "secondary_email", label: "Correo secundario" }, { key: "mandante", label: "Mandante" }, { key: "created_at", label: "Creación" }]} rows={rows as any} />
    </div>
  );
}
