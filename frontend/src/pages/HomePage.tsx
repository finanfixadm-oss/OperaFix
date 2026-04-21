import { useEffect, useState } from "react";
import { fetchDashboardOverview } from "../api";
import type { KpiOverview } from "../types";
import KpiCard from "../components/KpiCard";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);

export default function HomePage() {
  const [overview, setOverview] = useState<KpiOverview | null>(null);

  useEffect(() => {
    fetchDashboardOverview().then(setOverview).catch(() => undefined);
  }, []);

  return (
    <div className="page-stack">
      <div className="hero-banner">
        <div>
          <span className="eyebrow">Panel principal</span>
          <h3>OperaFix empieza a comportarse como un CRM operativo real</h3>
          <p>
            Ahora tienes una base para operar como Zoho: módulos, tablas, filtros, vista de detalle,
            documentos, notas, actividad e informes para el seguimiento de LM y TP.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard title="Registros LM" value={String(overview?.totalRecords ?? "-")} hint="Operación total" />
        <KpiCard title="Pagados" value={String(overview?.paidRecords ?? "-")} hint="Estado Gestión = Pagado" />
        <KpiCard title="Pendientes CC" value={String(overview?.pendingCC ?? "-")} hint="Sin confirmación CC" />
        <KpiCard title="Pendientes Poder" value={String(overview?.pendingPower ?? "-")} hint="Sin confirmación poder" />
        <KpiCard title="Monto devolución" value={formatCurrency(overview?.totalRefund ?? 0)} hint="Suma total" />
        <KpiCard title="Monto Finanfix" value={formatCurrency(overview?.totalFinanfix ?? 0)} hint="Ganancia acumulada" />
      </div>
    </div>
  );
}
