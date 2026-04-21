import { useEffect, useState } from "react";
import { fetchJson } from "../api";
import type { Collaborator, PaginatedLmRecords } from "../types";
import DataTable from "../components/DataTable";

export default function CollaboratorsPage() {
  const [rows, setRows] = useState<Collaborator[]>([]);
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
    fetchJson<Collaborator[]>(`/collaborators?${params.toString()}`).then(setRows).catch(() => setRows([]));
  }, [search, mandante]);

  const normalizedRows = rows.map((item) => ({ ...item, company_name: item.company?.business_name || "-" }));

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Datos</span>
          <h2 className="page-title">Colaboradores</h2>
        </div>
        <div className="toolbar-actions">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador" className="toolbar-input" />
          <select value={mandante} onChange={(e) => setMandante(e.target.value)} className="toolbar-input">
            <option value="">Todos los mandantes</option>
            {mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <DataTable title="Colaboradores" columns={[{ key: "full_name", label: "Nombre" }, { key: "email", label: "Correo" }, { key: "position", label: "Cargo" }, { key: "company_name", label: "Empresa" } as any]} rows={normalizedRows as any} />
    </div>
  );
}
