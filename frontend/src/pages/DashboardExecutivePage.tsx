
import { useEffect, useMemo, useState } from "react";
import "./dashboard-executive-pro.css";

type RecordItem = {
  id: string;
  mandante?: string | null;
  razon_social?: string | null;
  rut?: string | null;
  entidad?: string | null;
  estado_gestion?: string | null;
  monto_devolucion?: number | string | null;
  monto_real_pagado?: number | string | null;
  monto_real_cliente?: number | string | null;
  monto_real_finanfix_solutions?: number | string | null;
  mes_produccion_2026?: string | null;
  numero_solicitud?: string | null;
};

type PanelSize = "sm" | "md" | "lg" | "xl";

type DashboardPanel = {
  id: string;
  title: string;
  type: "kpi" | "table" | "bar" | "pie";
  metric: "count" | "monto_devolucion" | "monto_real_pagado" | "monto_real_cliente" | "monto_real_finanfix_solutions";
  groupBy?: keyof RecordItem;
  size: PanelSize;
};

const STORAGE_KEY = "operafix_dashboard_layout_v65";

const defaultPanels: DashboardPanel[] = [
  {
    id: "kpi-total",
    title: "Total gestiones",
    type: "kpi",
    metric: "count",
    size: "sm",
  },
  {
    id: "kpi-monto",
    title: "Monto devolución",
    type: "kpi",
    metric: "monto_devolucion",
    size: "sm",
  },
  {
    id: "estado-bar",
    title: "Gestiones por estado",
    type: "bar",
    metric: "count",
    groupBy: "estado_gestion",
    size: "md",
  },
  {
    id: "afp-pie",
    title: "Distribución por AFP",
    type: "pie",
    metric: "count",
    groupBy: "entidad",
    size: "md",
  },
  {
    id: "top-table",
    title: "Top gestiones por monto",
    type: "table",
    metric: "monto_devolucion",
    groupBy: "razon_social",
    size: "lg",
  },
];

function parseMoney(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const clean = String(value)
    .replace(/\$/g, "")
    .replace(/CLP/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getMetricValue(row: RecordItem, metric: DashboardPanel["metric"]): number {
  if (metric === "count") return 1;
  return parseMoney(row[metric]);
}

function buildGroupedData(records: RecordItem[], panel: DashboardPanel) {
  if (!panel.groupBy) {
    const total = records.reduce((acc, row) => acc + getMetricValue(row, panel.metric), 0);
    return [{ label: "Total", value: total }];
  }

  const grouped = new Map<string, number>();

  for (const row of records) {
    const label = String(row[panel.groupBy] || "Sin información");
    const value = getMetricValue(row, panel.metric);
    grouped.set(label, (grouped.get(label) || 0) + value);
  }

  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function PanelRenderer({ panel, records }: { panel: DashboardPanel; records: RecordItem[] }) {
  const data = useMemo(() => buildGroupedData(records, panel), [records, panel]);
  const total = data.reduce((acc, item) => acc + item.value, 0);
  const max = Math.max(...data.map((x) => x.value), 1);

  if (panel.type === "kpi") {
    return (
      <div className="dash-kpi">
        <div className="dash-kpi-value">
          {panel.metric === "count" ? total.toLocaleString("es-CL") : formatCLP(total)}
        </div>
        <div className="dash-kpi-caption">
          {panel.metric === "count" ? "registros" : "total acumulado"}
        </div>
      </div>
    );
  }

  if (panel.type === "table") {
    return (
      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>{panel.groupBy || "Grupo"}</th>
              <th>{panel.metric === "count" ? "Cantidad" : "Monto"}</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 12).map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{panel.metric === "count" ? row.value : formatCLP(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (panel.type === "pie") {
    return (
      <div className="dash-pie-list">
        {data.slice(0, 8).map((row, index) => {
          const percent = total ? Math.round((row.value / total) * 100) : 0;
          return (
            <div className="dash-pie-row" key={row.label}>
              <span className={`dash-dot dash-dot-${(index % 6) + 1}`} />
              <span className="dash-pie-label">{row.label}</span>
              <span className="dash-pie-value">{percent}%</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="dash-bars">
      {data.slice(0, 10).map((row) => {
        const width = Math.max(4, Math.round((row.value / max) * 100));
        return (
          <div className="dash-bar-row" key={row.label}>
            <div className="dash-bar-label">{row.label}</div>
            <div className="dash-bar-track">
              <div className="dash-bar-fill" style={{ width: `${width}%` }} />
            </div>
            <div className="dash-bar-value">
              {panel.metric === "count" ? row.value : formatCLP(row.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getPanelClass(size: PanelSize) {
  return `dash-panel dash-panel-${size}`;
}

export default function DashboardExecutivePage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [panels, setPanels] = useState<DashboardPanel[]>(defaultPanels);
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [mandanteFilter, setMandanteFilter] = useState<string>("Todos");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setPanels(parsed);
      } catch {
        setPanels(defaultPanels);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  }, [panels]);

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      try {
        const response = await fetch("/api/records?limit=5000");
        const json = await response.json();
        setRecords(Array.isArray(json) ? json : json.data || []);
      } catch (error) {
        console.error("No se pudo cargar dashboard:", error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, []);

  const mandantes = useMemo(() => {
    const values = new Set<string>();
    records.forEach((r) => {
      const value = r.mandante || (r as any).mandante?.name || "";
      if (value) values.add(String(value));
    });
    return ["Todos", ...Array.from(values).sort()];
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (mandanteFilter === "Todos") return records;
    return records.filter((r) => {
      const value = r.mandante || (r as any).mandante?.name || "";
      return String(value).toLowerCase() === mandanteFilter.toLowerCase();
    });
  }, [records, mandanteFilter]);

  const movePanel = (activeId: string, overId: string) => {
    if (activeId === overId) return;

    setPanels((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === activeId);
      const newIndex = prev.findIndex((p) => p.id === overId);
      if (oldIndex < 0 || newIndex < 0) return prev;

      const clone = [...prev];
      const [moved] = clone.splice(oldIndex, 1);
      clone.splice(newIndex, 0, moved);
      return clone;
    });
  };

  const resizePanel = (panelId: string, size: PanelSize) => {
    setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, size } : p)));
  };

  const clonePanel = (panel: DashboardPanel) => {
    setPanels((prev) => [
      ...prev,
      {
        ...panel,
        id: `${panel.id}-copy-${Date.now()}`,
        title: `${panel.title} copia`,
      },
    ]);
  };

  const removePanel = (panelId: string) => {
    if (!confirm("¿Eliminar este panel del dashboard?")) return;
    setPanels((prev) => prev.filter((p) => p.id !== panelId));
  };

  const resetLayout = () => {
    if (!confirm("¿Restaurar el orden y tamaño estándar del dashboard?")) return;
    setPanels(defaultPanels);
  };

  return (
    <main className="dash-page">
      <section className="dash-header">
        <div>
          <p className="dash-eyebrow">OperaFix Analytics</p>
          <h1>Dashboard Ejecutivo</h1>
          <p className="dash-subtitle">
            Ordena los paneles arrastrándolos y ajusta el tamaño de cada cuadro.
          </p>
        </div>

        <div className="dash-actions">
          <label>
            Mandante
            <select value={mandanteFilter} onChange={(e) => setMandanteFilter(e.target.value)}>
              {mandantes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={resetLayout}>
            Restaurar layout
          </button>
        </div>
      </section>

      <section className="dash-summary">
        <div>
          <strong>{filteredRecords.length.toLocaleString("es-CL")}</strong>
          <span>gestiones visibles</span>
        </div>
        <div>
          <strong>
            {formatCLP(filteredRecords.reduce((acc, r) => acc + parseMoney(r.monto_devolucion), 0))}
          </strong>
          <span>monto devolución</span>
        </div>
        <div>
          <strong>{loading ? "Cargando..." : "Activo"}</strong>
          <span>estado de datos</span>
        </div>
      </section>

      <section className="dash-grid">
        {panels.map((panel) => (
          <article
            key={panel.id}
            className={getPanelClass(panel.size)}
            draggable
            onDragStart={() => setDraggedPanelId(panel.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedPanelId) movePanel(draggedPanelId, panel.id);
              setDraggedPanelId(null);
            }}
          >
            <header className="dash-panel-header">
              <div className="dash-drag-handle" title="Arrastrar panel">
                ⋮⋮
              </div>
              <div>
                <h3>{panel.title}</h3>
                <p>
                  {panel.type.toUpperCase()} · {panel.metric}
                </p>
              </div>
              <div className="dash-panel-menu">
                <select
                  value={panel.size}
                  onChange={(e) => resizePanel(panel.id, e.target.value as PanelSize)}
                  title="Tamaño"
                >
                  <option value="sm">Pequeño</option>
                  <option value="md">Mediano</option>
                  <option value="lg">Grande</option>
                  <option value="xl">Extra</option>
                </select>
                <button type="button" onClick={() => clonePanel(panel)}>
                  Clonar
                </button>
                <button type="button" className="danger" onClick={() => removePanel(panel.id)}>
                  Eliminar
                </button>
              </div>
            </header>

            <div className="dash-panel-body">
              <PanelRenderer panel={panel} records={filteredRecords} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
