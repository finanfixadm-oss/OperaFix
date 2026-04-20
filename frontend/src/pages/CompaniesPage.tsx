import { useEffect, useState } from "react";
import { fetchCompanies } from "../api";
import type { Company } from "../types";
import SimpleTable from "../components/SimpleTable";

export default function CompaniesPage() {
  const [rows, setRows] = useState<Company[]>([]);
  useEffect(() => {
    fetchCompanies().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <SimpleTable
      title="Empresas"
      rows={rows}
      columns={[
        { key: "rut", label: "RUT" },
        { key: "business_name", label: "Nombre cliente" },
        { key: "mandante", label: "Mandante" },
        { key: "email", label: "Correo electrónico" }
      ]}
    />
  );
}
