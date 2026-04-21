import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { fetchJson } from "../api";

type CollaboratorRow = {
  id: string;
  full_name: string;
  email?: string | null;
  position?: string | null;
  company?: { business_name?: string | null } | null;
};

export default function CollaboratorsPage() {
  const [rows, setRows] = useState<CollaboratorRow[]>([]);

  useEffect(() => {
    fetchJson<CollaboratorRow[]>("/collaborators").then(setRows).catch(() => setRows([]));
  }, []);

  const normalized = rows.map((row) => ({
    ...row,
    company_name: row.company?.business_name || ""
  })) as Array<CollaboratorRow & { company_name: string }>;

  return (
    <DataTable
      title="Colaboradores"
      columns={[
        { key: "full_name", label: "Nombre" },
        { key: "email", label: "Correo" },
        { key: "position", label: "Cargo" },
        { key: "company_name", label: "Empresa" }
      ]}
      rows={normalized}
    />
  );
}
