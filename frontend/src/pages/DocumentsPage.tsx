import DataTable from "../components/DataTable";

const rows = [
  { id: "1", title: "Facturas Optimiza Co", module: "Documentos", uploaded_by: "Luis Mendoza", created_at: "2026-04-15" },
  { id: "2", title: "Checklist_Documentación_AFP_2026.pdf", module: "Documentos", uploaded_by: "Luis Mendoza", created_at: "2026-03-11" }
];

export default function DocumentsPage() {
  return (
    <DataTable
      title="Documentos"
      columns={[
        { key: "title", label: "Nombre" },
        { key: "module", label: "Módulo" },
        { key: "uploaded_by", label: "Cargado por" },
        { key: "created_at", label: "Fecha" }
      ]}
      rows={rows}
    />
  );
}
