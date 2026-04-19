import DataTable from "../components/DataTable";

const rows = [
  { id: "1", full_name: "Fernando Morei", email: "fernando.morey@iansa.cl", position: "Encargado RRHH", company: "Iansa" },
  { id: "2", full_name: "Renato Ramirez", email: "rramirez@guillaume.cl", position: "Analista", company: "Guillaume" }
];

export default function CollaboratorsPage() {
  return (
    <DataTable
      title="Colaboradores"
      columns={[
        { key: "full_name", label: "Nombre" },
        { key: "email", label: "Correo" },
        { key: "position", label: "Cargo" },
        { key: "company", label: "Empresa" }
      ]}
      rows={rows}
    />
  );
}
