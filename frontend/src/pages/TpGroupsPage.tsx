import DataTable from "../components/DataTable";

const rows = [
  { id: "1", name: "Grupo TP Norte", email: "tp@cliente.cl", mandante: "Sí", created_at: "2026-04-01" }
];

export default function TpGroupsPage() {
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
