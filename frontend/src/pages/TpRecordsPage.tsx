import DataTable from "../components/DataTable";

const rows = [
  { id: "1", mandante: "Polpaico", portal_access: "Sí", client_contract_status: "Activo", comment: "Consulta CEN enviada" }
];

export default function TpRecordsPage() {
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
