import { useEffect, useMemo, useState } from "react";
import { fetchAnalyticsDashboard } from "../api";
import type { AnalyticsDashboard } from "../types";

const currency = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);

export default function AnalysisPage() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  useEffect(() => {
    fetchAnalyticsDashboard().then(setData).catch(() => setData(null));
  }, []);

  const totalEntity = useMemo(
    () => (data?.byEntity || []).reduce((sum, item) => sum + Number(item._sum?.actual_finanfix_amount || 0), 0),
    [data]
  );

  return (
    <div className="page-stack">
      <div className="analysis-toolbar">
        <div className="analysis-filters">
          <button className="ghost-btn">Todos</button>
          <button className="ghost-btn">Finanfix Solution SpA</button>
          <button className="ghost-btn">Solo yo</button>
        </div>
        <div className="analysis-actions">
          <button className="ghost-btn">Agregar componente</button>
          <button className="primary-btn">Crear panel de información</button>
        </div>
      </div>

      <div className="analysis-grid">
        <section className="widget-card span-2">
          <div className="widget-header">
            <h3>Monto ganancia Finanfix por entidad</h3>
          </div>
          <div className="donut-list">
            {(data?.byEntity || []).map((item) => {
              const value = Number(item._sum?.actual_finanfix_amount || 0);
              const percent = totalEntity ? (value / totalEntity) * 100 : 0;
              return (
                <div className="metric-row" key={item.entity || "sin-entidad"}>
                  <div>
                    <strong>{item.entity || "Sin entidad"}</strong>
                    <span>{currency(value)}</span>
                  </div>
                  <div className="metric-bar">
                    <div className="metric-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <small>{percent.toFixed(1)}%</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="widget-card">
          <div className="widget-header">
            <h3>Estado Gestión</h3>
          </div>
          <div className="mini-table">
            {(data?.byStatus || []).map((item) => (
              <div className="mini-row" key={item.management_status || "sin-estado"}>
                <span>{item.management_status || "Sin estado"}</span>
                <strong>{item._count._all}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="widget-card span-2">
          <div className="widget-header">
            <h3>Mandantes con mayor monto Finanfix</h3>
          </div>
          <div className="mini-table">
            {(data?.byMandante || []).slice(0, 8).map((item) => (
              <div className="mini-row" key={item.mandante || "sin-mandante"}>
                <span>{item.mandante || "Sin mandante"}</span>
                <strong>{currency(Number(item._sum?.actual_finanfix_amount || 0))}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="widget-card span-2">
          <div className="widget-header">
            <h3>Actividad reciente</h3>
          </div>
          <div className="mini-table">
            {(data?.recentRecords || []).map((item) => (
              <div className="mini-row" key={item.id}>
                <span>
                  {item.business_name || item.rut} · {item.entity || "Sin entidad"}
                </span>
                <strong>{item.management_status || "Sin estado"}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
