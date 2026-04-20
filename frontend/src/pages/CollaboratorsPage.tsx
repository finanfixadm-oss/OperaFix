import { useEffect, useState } from "react";
import { fetchCollaborators } from "../api";
import type { Collaborator } from "../types";
import SimpleTable from "../components/SimpleTable";

export default function CollaboratorsPage() {
  const [rows, setRows] = useState<Collaborator[]>([]);
  useEffect(() => {
    fetchCollaborators().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <SimpleTable
      title="Colaboradores"
      rows={rows}
      columns={[
        { key: "full_name", label: "Nombre" },
        { key: "email", label: "Correo" },
        { key: "position", label: "Cargo" },
        { key: "company", label: "Empresa", render: (row) => row.company?.business_name || "" }
      ]}
    />
  );
}
