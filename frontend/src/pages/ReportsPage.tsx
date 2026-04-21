import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../api";
import type { LmRecord, PaginatedLmRecords } from "../types";
import SimpleTable from "../components/SimpleTable";

const formatCurrency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function ReportsPage() {
  const [rows, setRows] = useState<LmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=100")
      .then((data) => mounted && setRows(data.items || []))
      .catch(() => {
        if (mounted) {
          setRows([]);
          setError("No se pudieron cargar los informes.");
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const totalMonto = useMemo(() => rows.reduce((sum, row) => sum + Number(row.actual_paid_amount || 0), 0), [rows]);

  return (
    <div className="page-stack">
      <div className="hero-banner">
        <div>
          <span className="eyebrow">Informes</span>
          <h3>Informe operativo de registros LM</h3>
          <p>Listado resumido de registros con montos y estado de gestión.</p>
        </div>
      </div>

      {loading && <div className="inline-message">Cargando informes...</div>}
      {error && <div className="inline-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="kpi-grid two-cols">
            <div className="kpi-card"><span>Total registros</span><strong>{rows.length}</strong></div>
            <div className="kpi-card"><span>Monto total pagado</span><strong>{formatCurrency(totalMonto)}</strong></div>
          </div>
          <SimpleTable
            title="Registros LM"
            rows={rows}
            columns={[
              { key: "rut", label: "RUT" },
              { key: "business_name", label: "Razón Social" },
              { key: "entity", label: "Entidad" },
              { key: "management_status", label: "Estado Gestión" },
              { key: "refund_amount", label: "Monto Devolución", render: (row) => formatCurrency(row.refund_amount) },
              { key: "actual_paid_amount", label: "Monto Pagado", render: (row) => formatCurrency(row.actual_paid_amount) },
            ]}
          />
        </>
      )}
    </div>
  );
}
