import { useEffect, useState } from "react";
import { fetchDocuments, fileUrl } from "../api";
import type { DocumentItem } from "../types";
import SimpleTable from "../components/SimpleTable";

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocumentItem[]>([]);
  useEffect(() => {
    fetchDocuments().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <SimpleTable
      title="Documentos"
      rows={rows}
      columns={[
        { key: "title", label: "Nombre" },
        { key: "related_module", label: "Módulo" },
        { key: "created_at", label: "Fecha", render: (row) => new Date(row.created_at).toLocaleString("es-CL") },
        {
          key: "open",
          label: "Archivo",
          render: (row) => (
            <a href={fileUrl(row)} target="_blank" rel="noreferrer" className="text-link">
              Abrir
            </a>
          )
        }
      ]}
    />
  );
}
