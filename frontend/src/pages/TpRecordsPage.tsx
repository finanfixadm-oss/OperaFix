import { useEffect, useState } from "react";
import { fetchJson } from "../api";
import type { PaginatedLmRecords, TpRecord } from "../types";
import DataTable from "../components/DataTable";

export default function TpRecordsPage() {
  const [rows, setRows] = useState<TpRecord[]>([]);
  const [mandantes, setMandantes] = useState<string[]>([]);
  const [mandante, setMandante] = useState("");

  useEffect(() => {
    fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=200").then((data) => setMandantes(data.filterOptions.mandantes || [])).catch(() => setMandantes([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (mandante) params.set("mandante", mandante);
    fetchJson<TpRecord[]>(`/tp-records?${params.toString()}`).then(setRows).catch(() => setRows([]));
  }, [mandante]);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Trabajo Pesado</span>
          <h2 className="page-title">Gestiones - TP</h2>
        </div>
        <div className="toolbar-actions">
          <select value={mandante} onChange={(e) => setMandante(e.target.value)} className="toolbar-input">
            <option value="">Todos los mandantes</option>
            {mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <DataTable title="Gestiones - TP" columns={[{ key: "mandante", label: "Mandante" }, { key: "portal_access", label: "Acceso portal" }, { key: "client_contract_status", label: "Estado contrato" }, { key: "comment", label: "Comentario" }]} rows={rows as any} />
    </div>
  );
}
