import DataTable from "../components/DataTable";

const rows = [
  { id: "1", name: "Optimiza Consulting", secondary_email: "apoyo@optimiza.cl", mandante: "Sí", created_at: "2026-03-17" }
];

export default function LmGroupsPage() {
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
