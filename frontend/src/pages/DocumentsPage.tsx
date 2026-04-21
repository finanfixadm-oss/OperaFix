import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { fetchJson } from "../api";

type DocumentRow = {
  id: string;
  title: string;
  related_module?: string | null;
  created_at?: string;
  original_filename?: string;
};

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocumentRow[]>([]);

  useEffect(() => {
    fetchJson<DocumentRow[]>("/documents").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <DataTable
      title="Documentos"
      columns={[
        { key: "title", label: "Nombre" },
        { key: "related_module", label: "Módulo" },
        { key: "original_filename", label: "Archivo original" },
        { key: "created_at", label: "Fecha" }
      ]}
      rows={rows}
    />
  );
}
