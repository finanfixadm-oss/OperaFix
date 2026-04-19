import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { fetchJson } from "../api";
import { LmRecord } from "../types";

export default function LmRecordsPage() {
  const [rows, setRows] = useState<LmRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<LmRecord[]>("/lm-records")
      .then((data) => setRows(data))
      .catch(() =>
        setRows([
          {
            id: "1",
            rut: "96717980-9",
            business_name: "SK",
            entity: "AFP MODELO",
            management_status: "Anulada",
            refund_amount: 12998,
            confirmation_cc: true,
            portal_access: "Sí"
          },
          {
            id: "2",
            rut: "96801810-8",
            business_name: "SGS",
            entity: "AFP CAPITAL",
            management_status: "Gestionado",
            refund_amount: 6050221,
            confirmation_cc: true,
            portal_access: "Sí"
          }
        ])
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-box">Cargando registros...</div>;
  }

  return (
    <DataTable
      title="Registros de empresas"
      columns={[
        { key: "business_name", label: "Buscar Grupo" },
        { key: "rut", label: "RUT" },
        { key: "entity", label: "Entidad" },
        { key: "management_status", label: "Estado Gestión" },
        { key: "refund_amount", label: "Monto Devolución" },
        { key: "portal_access", label: "Acceso portal" }
      ]}
      rows={rows}
    />
  );
}
