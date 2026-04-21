import { useEffect, useState } from "react";
import { fetchJson } from "../api";
import type { Company, PaginatedLmRecords } from "../types";
import DataTable from "../components/DataTable";

export default function CompaniesPage() {
  const [rows, setRows] = useState<Company[]>([]);
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
    fetchJson<Company[]>(`/companies?${params.toString()}`).then(setRows).catch(() => setRows([]));
  }, [search, mandante]);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Datos</span>
          <h2 className="page-title">Empresas</h2>
        </div>
        <div className="toolbar-actions">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa o RUT" className="toolbar-input" />
          <select value={mandante} onChange={(e) => setMandante(e.target.value)} className="toolbar-input">
            <option value="">Todos los mandantes</option>
            {mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <DataTable title="Empresas" columns={[{ key: "rut", label: "RUT" }, { key: "business_name", label: "Razón social" }, { key: "mandante", label: "Mandante" }, { key: "email", label: "Correo" }]} rows={rows} />
    </div>
  );
}
