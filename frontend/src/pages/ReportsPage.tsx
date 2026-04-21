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

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=50");

        if (mounted) {
          setRows(data.items || []);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setRows([]);
          setError("No se pudieron cargar los informes.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const totalMonto = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.actual_paid_amount || 0), 0);
  }, [rows]);

  return (
    <div className="page-stack">
      <div className="hero-banner">
        <div>
          <span className="eyebrow">Informes</span>
          <h3>Informe operativo de registros LM</h3>
          <p>
            Listado resumido de registros con sus montos y estado de gestión.
          </p>
        </div>
      </div>

      {loading && <div className="inline-message">Cargando informes...</div>}
      {error && <div className="inline-message">{error}</div>}

      {!loading && !error && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span>Total registros</span>
              <strong>{rows.length}</strong>
            </div>
            <div className="kpi-card">
              <span>Monto total pagado</span>
              <strong>{formatCurrency(totalMonto)}</strong>
            </div>
          </div>

          <SimpleTable
            title="Registros LM"
            rows={rows}
            columns={[
              { key: "rut", label: "RUT" },
              { key: "business_name", label: "Razón Social" },
              { key: "entity", label: "Entidad" },
              { key: "management_status", label: "Estado Gestión" },
              {
                key: "refund_amount",
                label: "Monto Devolución",
                render: (row: LmRecord) => formatCurrency(row.refund_amount),
              },
              {
                key: "actual_paid_amount",
                label: "Monto Pagado",
                render: (row: LmRecord) => formatCurrency(row.actual_paid_amount),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}