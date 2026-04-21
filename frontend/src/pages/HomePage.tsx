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
  const [mandantes, setMandantes] = useState<string[]>([]);
  const [selectedMandante, setSelectedMandante] = useState<string>("Todos");

  useEffect(() => {
    fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=200")
      .then((data) => {
        setRows(data.items || []);
        const unique = Array.from(new Set((data.filterOptions.mandantes || []).filter(Boolean)));
        setMandantes(["Todos", ...unique]);
      })
      .catch(() => {
        setRows([]);
        setMandantes(["Todos"]);
      });
  }, []);

  const scopedRows = useMemo(() => {
    if (selectedMandante === "Todos") return rows;
    return rows.filter((item) => item.mandante === selectedMandante);
  }, [rows, selectedMandante]);

  const totalRecords = scopedRows.length;
  const paidRecords = scopedRows.filter((item) => item.management_status === "Pagado").length;
  const pendingCC = scopedRows.filter((item) => !item.confirmation_cc).length;
  const pendingPower = scopedRows.filter((item) => !item.confirmation_power).length;

  const totalRefund = scopedRows.reduce((sum, item) => sum + Number(item.refund_amount || 0), 0);
  const totalPaid = scopedRows.reduce((sum, item) => sum + Number(item.actual_paid_amount || 0), 0);

  return (
    <div className="page-stack">
      <div className="hero-banner hero-with-selector">
        <div>
          <span className="eyebrow">Inicio</span>
          <h3>Panel ejecutivo por mandante</h3>
          <p>
            Selecciona un mandante para ver solo sus gestiones, montos, estados y KPIs operativos.
          </p>
        </div>
        <div className="mandante-switcher">
          <label>Mandante activo</label>
          <select value={selectedMandante} onChange={(e) => setSelectedMandante(e.target.value)}>
            {mandantes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard title="Registros LM" value={String(totalRecords)} hint="Total del mandante seleccionado" />
        <KpiCard title="Pagados" value={String(paidRecords)} hint="Estado Gestión = Pagado" />
        <KpiCard title="Pendientes CC" value={String(pendingCC)} hint="Sin confirmación CC" />
        <KpiCard title="Pendientes Poder" value={String(pendingPower)} hint="Sin confirmación Poder" />
        <KpiCard title="Monto devolución" value={formatCurrency(totalRefund)} hint="Suma de devolución" />
        <KpiCard title="Monto pagado" value={formatCurrency(totalPaid)} hint="Monto real pagado" />
      </div>

      <div className="widget-card">
        <div className="widget-header">
          <h3>Actividad por mandante</h3>
        </div>
        <div className="mini-table">
          {scopedRows.slice(0, 8).map((row) => (
            <div className="mini-row" key={row.id}>
              <span>{row.business_name || row.rut}</span>
              <strong>{row.management_status || "Sin estado"}</strong>
            </div>
          ))}
          {scopedRows.length === 0 && <div className="empty-state">No hay información para este mandante.</div>}
        </div>
      </div>
    </div>
  );
}
