import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { fetchJson } from "../api";

type TpRecordRow = {
  id: string;
  mandante?: string | null;
  portal_access?: string | null;
  client_contract_status?: string | null;
  comment?: string | null;
};

export default function TpRecordsPage() {
  const [rows, setRows] = useState<TpRecordRow[]>([]);

  useEffect(() => {
    fetchJson<TpRecordRow[]>("/tp-records").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <DataTable
      title="Gestiones - TP"
      columns={[
        { key: "mandante", label: "Mandante" },
        { key: "portal_access", label: "Acceso portal" },
        { key: "client_contract_status", label: "Estado contrato" },
        { key: "comment", label: "Comentario" }
      ]}
      rows={rows}
    />
  );
}
