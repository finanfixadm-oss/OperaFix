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

type EntitySummary = {
  entity: string;
  count: number;
  total: number;
};

type StatusSummary = {
  status: string;
  count: number;
};

type MandanteSummary = {
  mandante: string;
  count: number;
  total: number;
};

export default function AnalysisPage() {
  const [rows, setRows] = useState<LmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchJson<PaginatedLmRecords>("/lm-records?page=1&pageSize=200");

        if (mounted) {
          setRows(data.items || []);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setRows([]);
          setError("No se pudo cargar el análisis.");
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

  const totalPagado = useMemo(() => {
    return rows.reduce((sum, item) => sum + safeNumber(item.actual_paid_amount), 0);
  }, [rows]);

  const byEntity = useMemo<EntitySummary[]>(() => {
    const map = new Map<string, EntitySummary>();

    rows.forEach((item) => {
      const key = item.entity?.trim() || "Sin entidad";
      const current = map.get(key) || { entity: key, count: 0, total: 0 };
      current.count += 1;
      current.total += safeNumber(item.actual_paid_amount);
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const byStatus = useMemo<StatusSummary[]>(() => {
    const map = new Map<string, number>();

    rows.forEach((item) => {
      const key = item.management_status?.trim() || "Sin estado";
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const byMandante = useMemo<MandanteSummary[]>(() => {
    const map = new Map<string, MandanteSummary>();

    rows.forEach((item) => {
      const key = item.mandante?.trim() || "Sin mandante";
      const current = map.get(key) || { mandante: key, count: 0, total: 0 };
      current.count += 1;
      current.total += safeNumber(item.actual_paid_amount);
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  return (
    <div className="page-stack">
      <div className="analysis-toolbar">
        <div className="analysis-filters">
          <button className="ghost-btn">Todos</button>
          <button className="ghost-btn">Finanfix Solutions SpA</button>
          <button className="ghost-btn">Solo yo</button>
        </div>
        <div className="analysis-actions">
          <button className="ghost-btn">Agregar componente</button>
          <button className="primary-btn">Crear panel de información</button>
        </div>
      </div>

      {loading && <div className="inline-message">Cargando análisis...</div>}
      {error && <div className="inline-message">{error}</div>}

      {!loading && !error && (
        <div className="analysis-grid">
          <section className="widget-card span-2">
            <div className="widget-header">
              <h3>Monto pagado por entidad</h3>
            </div>

            <div className="donut-list">
              {byEntity.map((item) => {
                const percent = totalPagado ? (item.total / totalPagado) * 100 : 0;

                return (
                  <div className="metric-row" key={item.entity}>
                    <div>
                      <strong>{item.entity}</strong>
                      <span>{currency(item.total)}</span>
                    </div>
                    <div className="metric-bar">
                      <div
                        className="metric-bar-fill"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <small>{percent.toFixed(1)}%</small>
                  </div>
                );
              })}

              {byEntity.length === 0 && <div className="empty-state">Sin datos.</div>}
            </div>
          </section>

          <section className="widget-card">
            <div className="widget-header">
              <h3>Estado Gestión</h3>
            </div>

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

          <section className="widget-card span-2">
            <div className="widget-header">
              <h3>Mandantes con mayor monto pagado</h3>
            </div>

            <div className="mini-table">
              {byMandante.slice(0, 8).map((item) => (
                <div className="mini-row" key={item.mandante}>
                  <span>{item.mandante}</span>
                  <strong>{currency(item.total)}</strong>
                </div>
              ))}

              {byMandante.length === 0 && <div className="empty-state">Sin datos.</div>}
            </div>
          </section>

          <section className="widget-card span-2">
            <div className="widget-header">
              <h3>Actividad reciente</h3>
            </div>

            <div className="mini-table">
              {rows.slice(0, 8).map((item) => (
                <div className="mini-row" key={item.id}>
                  <span>
                    {item.business_name || item.rut} · {item.entity || "Sin entidad"}
                  </span>
                  <strong>{item.management_status || "Sin estado"}</strong>
                </div>
              ))}

              {rows.length === 0 && <div className="empty-state">Sin datos.</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}