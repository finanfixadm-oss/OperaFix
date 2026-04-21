import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { fetchJson } from "../api";

type CompanyRow = {
  id: string;
  rut: string;
  business_name: string;
  mandante?: string | null;
  email?: string | null;
};

export default function CompaniesPage() {
  const [rows, setRows] = useState<CompanyRow[]>([]);

  useEffect(() => {
    fetchJson<CompanyRow[]>("/companies").then(setRows).catch(() => setRows([]));
  }, []);

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
