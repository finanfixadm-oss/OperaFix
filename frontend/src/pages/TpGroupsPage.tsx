import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { fetchJson } from "../api";

type TpGroupRow = {
  id: string;
  name: string;
  email?: string | null;
  mandante?: string | null;
  created_at?: string;
};

export default function TpGroupsPage() {
  const [rows, setRows] = useState<TpGroupRow[]>([]);

  useEffect(() => {
    fetchJson<TpGroupRow[]>("/tp-groups").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <DataTable
      title="Grupos empresas - TP"
      columns={[
        { key: "name", label: "Nombre grupo" },
        { key: "email", label: "Correo" },
        { key: "mandante", label: "Mandante" },
        { key: "created_at", label: "Creación" }
      ]}
      rows={rows}
    />
  );
}
