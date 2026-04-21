import { useEffect, useMemo, useState } from "react";
import { fetchDashboardOverview, fetchLmRecords } from "../api";
import type { KpiOverview, PaginatedLmRecords } from "../types";
import KpiCard from "../components/KpiCard";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);

export default function HomePage() {
  const [overview, setOverview] = useState<KpiOverview | null>(null);
  const [mandante, setMandante] = useState("");
  const [records, setRecords] = useState<PaginatedLmRecords | null>(null);

  useEffect(() => {
    fetchDashboardOverview().then(setOverview).catch(() => setOverview(null));
    fetchLmRecords({ page: 1, pageSize: 100 }).then(setRecords).catch(() => setRecords(null));
  }, []);

  const mandantes = useMemo(() => records?.filterOptions.mandantes || [], [records]);
  const visibleRows = useMemo(() => {
    const rows = records?.items || [];
    return mandante ? rows.filter((r) => r.mandante === mandante) : rows;
  }, [records, mandante]);

  return (
    <div className="page-stack">
      <div className="hero-banner home-hero">
        <div>
          <span className="eyebrow">Finanfix Solutions SpA</span>
          <h3>OperaFix CRM</h3>
          <p>Inicio operativo por mandante. Al seleccionar un mandante solo se visualiza su información.</p>
        </div>
        <div className="hero-select-wrap">
          <label className="field-block compact">
            <span>Mandante</span>
            <select value={mandante} onChange={(e) => setMandante(e.target.value)}>
              <option value="">Todos</option>
              {mandantes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard title="Registros LM" value={String(overview?.totalRecords ?? 0)} hint="Operación total" />
        <KpiCard title="Pagados" value={String(overview?.paidRecords ?? 0)} hint="Estado Gestión = Pagado" />
        <KpiCard title="Pendientes CC" value={String(overview?.pendingCC ?? 0)} hint="Sin confirmación CC" />
        <KpiCard title="Pendientes Poder" value={String(overview?.pendingPower ?? 0)} hint="Sin confirmación poder" />
        <KpiCard title="Monto devolución" value={formatCurrency(overview?.totalRefund ?? 0)} hint="Suma total" />
        <KpiCard title="Monto Finanfix" value={formatCurrency(overview?.totalFinanfix ?? 0)} hint="Ganancia acumulada" />
      </div>

      <div className="table-card">
        <div className="table-toolbar compact">
          <h3>Gestiones visibles del mandante</h3>
          <span className="muted">{visibleRows.length} registros</span>
        </div>
        <div className="table-scroll">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Razón Social</th>
                <th>Entidad</th>
                <th>Estado Gestión</th>
                <th>Monto pagado</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr><td colSpan={4}>Sin registros</td></tr>
              ) : visibleRows.slice(0, 10).map((row) => (
                <tr key={row.id}>
                  <td>{row.business_name || row.rut}</td>
                  <td>{row.entity || "-"}</td>
                  <td>{row.management_status || "-"}</td>
                  <td>{formatCurrency(Number(row.actual_paid_amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
