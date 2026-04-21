import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { fetchJson } from "../api";

type LmGroupRow = {
  id: string;
  name: string;
  secondary_email?: string | null;
  mandante?: string | null;
  created_at?: string;
};

export default function LmGroupsPage() {
  const [rows, setRows] = useState<LmGroupRow[]>([]);

  useEffect(() => {
    fetchJson<LmGroupRow[]>("/lm-groups").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <DataTable
      title="Grupos de empresas - LM"
      columns={[
        { key: "name", label: "Nombre grupo" },
        { key: "secondary_email", label: "Correo secundario" },
        { key: "mandante", label: "Mandante" },
        { key: "created_at", label: "Creación" }
      ]}
      rows={rows}
    />
  );
}
