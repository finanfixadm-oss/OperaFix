import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../api";
import type { LmRecord, PaginatedLmRecords } from "../types";

const currency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);

const safeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function AnalysisPage() {
  const [rows, setRows] = useState<LmRecord[]>([]);
  const [selectedMandante, setSelectedMandante] = useState<string>("Todos");
  const [mandantes, setMandantes] = useState<string[]>(["Todos"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=300")
      .then((data) => {
        if (!mounted) return;
        setRows(data.items || []);
        setMandantes(["Todos", ...data.filterOptions.mandantes.filter(Boolean)]);
      })
      .catch(() => {
        if (!mounted) return;
        setRows([]);
        setMandantes(["Todos"]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const scopedRows = useMemo(() => {
    if (selectedMandante === "Todos") return rows;
    return rows.filter((item) => item.mandante === selectedMandante);
  }, [rows, selectedMandante]);

  const totalPagado = scopedRows.reduce((sum, item) => sum + safeNumber(item.actual_paid_amount), 0);

  const byEntity = useMemo(() => {
    const map = new Map<string, { entity: string; count: number; total: number }>();
    scopedRows.forEach((item) => {
      const key = item.entity?.trim() || "Sin entidad";
      const current = map.get(key) || { entity: key, count: 0, total: 0 };
      current.count += 1;
      current.total += safeNumber(item.actual_paid_amount);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [scopedRows]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    scopedRows.forEach((item) => {
      const key = item.management_status?.trim() || "Sin estado";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [scopedRows]);

  return (
    <div className="page-stack">
      <div className="analysis-toolbar">
        <div className="analysis-filters">
          <button className="ghost-btn">Todos</button>
          <select className="ghost-select" value={selectedMandante} onChange={(e) => setSelectedMandante(e.target.value)}>
            {mandantes.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button className="ghost-btn">Solo yo</button>
        </div>
        <div className="analysis-actions">
          <button className="ghost-btn">Agregar componente</button>
          <button className="primary-btn">Crear panel de información</button>
        </div>
      </div>

      {loading ? <div className="inline-message">Cargando análisis...</div> : null}

      {!loading && (
        <div className="analysis-grid">
          <section className="widget-card span-2">
            <div className="widget-header"><h3>Monto pagado por entidad</h3></div>
            <div className="donut-list">
              {byEntity.map((item) => {
                const percent = totalPagado ? (item.total / totalPagado) * 100 : 0;
                return (
                  <div className="metric-row" key={item.entity}>
                    <div>
                      <strong>{item.entity}</strong>
                      <span>{currency(item.total)}</span>
                    </div>
                    <div className="metric-bar"><div className="metric-bar-fill" style={{ width: `${percent}%` }} /></div>
                    <small>{percent.toFixed(1)}%</small>
                  </div>
                );
              })}
              {byEntity.length === 0 && <div className="empty-state">Sin datos.</div>}
            </div>
          </section>

          <section className="widget-card">
            <div className="widget-header"><h3>Estado Gestión</h3></div>
            <div className="mini-table">
              {byStatus.map((item) => (
                <div className="mini-row" key={item.status}>
                  <span>{item.status}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {byStatus.length === 0 && <div className="empty-state">Sin datos.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
