import { useEffect, useState } from "react";
import { fetchLmRecords } from "../api";
import type { LmRecord } from "../types";
import SimpleTable from "../components/SimpleTable";

const formatCurrency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function ReportsPage() {
  const [rows, setRows] = useState<LmRecord[]>([]);
  useEffect(() => {
    fetchLmRecords({ page: 1, pageSize: 50 }).then((data) => setRows(data.items)).catch(() => setRows([]));
  }, []);

  return (
    <SimpleTable
      title="Informe operativo de registros LM"
      rows={rows}
      columns={[
        { key: "rut", label: "RUT" },
        { key: "business_name", label: "Razón Social" },
        { key: "entity", label: "Entidad" },
        { key: "management_status", label: "Estado Gestión" },
        { key: "refund_amount", label: "Monto Devolución", render: (row) => formatCurrency(row.refund_amount) },
        { key: "actual_finanfix_amount", label: "Monto Finanfix", render: (row) => formatCurrency(row.actual_finanfix_amount) }
      ]}
    />
  );
}
