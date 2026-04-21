import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../api";
import type { LmRecord, PaginatedLmRecords } from "../types";
import KpiCard from "../components/KpiCard";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function HomePage() {
  const [rows, setRows] = useState<LmRecord[]>([]);

  useEffect(() => {
    fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=200")
      .then((data) => setRows(data.items || []))
      .catch(() => setRows([]));
  }, []);

  const totalRecords = rows.length;
  const paidRecords = rows.filter((item) => item.management_status === "Pagado").length;
  const pendingCC = rows.filter((item) => !item.confirmation_cc).length;
  const pendingPower = rows.filter((item) => !item.confirmation_power).length;

  const totalRefund = useMemo(() => {
    return rows.reduce((sum, item) => sum + Number(item.refund_amount || 0), 0);
  }, [rows]);

  const totalPaid = useMemo(() => {
    return rows.reduce((sum, item) => sum + Number(item.actual_paid_amount || 0), 0);
  }, [rows]);

  return (
    <div className="page-stack">
      <div className="hero-banner">
        <div>
          <span className="eyebrow">Panel principal</span>
          <h3>OperaFix empieza a comportarse como un CRM operativo real</h3>
          <p>
            Ahora tienes una base para operar como Zoho: módulos, tablas, filtros,
            vista de detalle, documentos, notas, actividad e informes para LM y TP.
          </p>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard title="Registros LM" value={String(totalRecords)} hint="Operación total" />
        <KpiCard title="Pagados" value={String(paidRecords)} hint="Estado Gestión = Pagado" />
        <KpiCard title="Pendientes CC" value={String(pendingCC)} hint="Sin confirmación CC" />
        <KpiCard title="Pendientes Poder" value={String(pendingPower)} hint="Sin confirmación poder" />
        <KpiCard title="Monto devolución" value={formatCurrency(totalRefund)} hint="Suma total" />
        <KpiCard title="Monto pagado" value={formatCurrency(totalPaid)} hint="Monto real pagado" />
      </div>
    </div>
  );
}