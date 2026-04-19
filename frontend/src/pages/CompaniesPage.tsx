import DataTable from "../components/DataTable";

const rows = [
  { id: "1", rut: "76.123.456-7", business_name: "Optimiza Consulting", mandante: "Sí", email: "contacto@optimiza.cl" },
  { id: "2", rut: "77.987.654-3", business_name: "Mundo Previsional", mandante: "Sí", email: "contacto@mundoprevisional.cl" }
];

export default function CompaniesPage() {
  return (
    <DataTable
      title="Empresas"
      columns={[
        { key: "rut", label: "RUT" },
        { key: "business_name", label: "Razón social" },
        { key: "mandante", label: "Mandante" },
        { key: "email", label: "Correo" }
      ]}
      rows={rows}
    />
  );
}
