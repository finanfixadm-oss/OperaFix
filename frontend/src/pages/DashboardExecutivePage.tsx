import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "../api";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import type { FilterRule } from "../types";
import type { RecordItem } from "../types-records";
import { defaultRecordColumnFields, formatCellValue, getValueByPath, recordColumns, recordFilterFields, type RecordColumnDefinition } from "../utils-record-fields";

function money(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function keyText(value: unknown, fallback = "Sin información") {
  const text = String(value || "").trim();
  return text || fallback;
}

function matchRule(value: unknown, rule: FilterRule) {
  const normalized = String(value ?? "").toLowerCase();
  const query = String(rule.value ?? "").toLowerCase();

  switch (rule.operator) {
    case "equals": return normalized === query;
    case "not_equals": return normalized !== query;
    case "contains": return normalized.includes(query);
    case "not_contains": return !normalized.includes(query);
    case "starts_with": return normalized.startsWith(query);
    case "ends_with": return normalized.endsWith(query);
    case "includes_all": return query.split(",").map((x) => x.trim()).filter(Boolean).every((part) => normalized.includes(part));
    case "includes_any": return query.split(",").map((x) => x.trim()).filter(Boolean).some((part) => normalized.includes(part));
    default: return true;
  }
}


function daysSince(value?: string | null) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function groupSum(rows: RecordItem[], keyGetter: (row: RecordItem) => string, amountGetter: (row: RecordItem) => number) {
  const map = new Map<string, { name: string; count: number; amount: number }>();
  rows.forEach((row) => {
    const name = keyGetter(row);
    const current = map.get(name) || { name, count: 0, amount: 0 };
    current.count += 1;
    current.amount += amountGetter(row);
    map.set(name, current);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.count - a.count);
}

function exportCsv(filename: string, rows: RecordItem[], columns: RecordColumnDefinition[]) {
  const headers = columns.map((column) => column.label);
  const body = rows.map((row) => columns.map((column) => formatCellValue(column.value(row), column)));
  const csv = [headers, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DashboardExecutivePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mandante, setMandante] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("operafix_dashboard_visible_columns_v26");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.filter((field) => recordColumns.some((column) => column.field === field));
        }
      }
    } catch {}
    return defaultRecordColumnFields;
  });
  const [metaMensual, setMetaMensual] = useState(83000000);

  async function load() {
    setLoading(true);
    try {
      setRows(await fetchJson<RecordItem[]>("/records"));
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    localStorage.setItem("operafix_dashboard_visible_columns_v26", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const mandantes = useMemo(() => Array.from(new Set(rows.map((row) => keyText(row.mandante?.name || (row as any).mandante, "Sin mandante")))).sort(), [rows]);
  const estados = useMemo(() => Array.from(new Set(rows.map((row) => keyText(row.estado_gestion, "Sin estado")))).sort(), [rows]);

  const selectedColumns = useMemo(() => {
    return visibleColumns
      .map((field) => recordColumns.find((column) => column.field === field))
      .filter(Boolean) as RecordColumnDefinition[];
  }, [visibleColumns]);

  function toggleColumn(field: string) {
    setVisibleColumns((prev) => prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]);
  }

  function moveColumn(field: string, direction: "left" | "right") {
    setVisibleColumns((prev) => {
      const index = prev.indexOf(field);
      if (index === -1) return prev;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function resetColumns() {
    setVisibleColumns(defaultRecordColumnFields);
  }

  function selectAllColumns() {
    setVisibleColumns(recordColumns.map((column) => column.field));
  }

  const data = useMemo(() => rows.filter((row) => {
    const rowMandante = keyText(row.mandante?.name || (row as any).mandante, "Sin mandante");
    const rowEstado = keyText(row.estado_gestion, "Sin estado");
    const rowTipo = keyText(row.management_type || row.motivo_tipo_exceso, "Sin tipo");
    const matchesTopFilters = (mandante === "todos" || rowMandante === mandante)
      && (estado === "todos" || rowEstado === estado)
      && (tipo === "todos" || rowTipo === tipo);

    if (!matchesTopFilters) return false;

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      const matchesSearch = recordColumns
        .map((column) => column.value(row))
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (activeRules.length) {
      return activeRules.every((rule) => matchRule(getValueByPath(row, rule.field), rule));
    }

    return true;
  }), [rows, mandante, estado, tipo, quickSearch, activeRules]);

  const totalDevolucion = data.reduce((sum, row) => sum + numberValue(row.monto_devolucion), 0);
  const totalFinanfix = data.reduce((sum, row) => sum + numberValue(row.monto_real_finanfix_solutions || row.monto_finanfix_solutions), 0);
  const totalCliente = data.reduce((sum, row) => sum + numberValue(row.monto_real_cliente || row.monto_cliente), 0);
  const pendientes = data.filter((row) => !/cerrada|pagada|facturada/i.test(String(row.estado_gestion || ""))).length;
  const pagadas = data.filter((row) => /pagada|pago|facturada|cerrada/i.test(String(row.estado_gestion || ""))).length;
  const rechazadas = data.filter((row) => /rechaz/i.test(String(row.estado_gestion || ""))).length;
  const avanceMeta = Math.min(100, metaMensual > 0 ? (totalDevolucion / metaMensual) * 100 : 0);

  const byMandante = groupSum(data, (row) => keyText(row.mandante?.name || (row as any).mandante, "Sin mandante"), (row) => numberValue(row.monto_devolucion));
  const byEntidad = groupSum(data, (row) => keyText(row.entidad || row.lineAfp?.afp_name, "Sin AFP"), (row) => numberValue(row.monto_devolucion));
  const byEstado = groupSum(data, (row) => keyText(row.estado_gestion, "Sin estado"), (row) => numberValue(row.monto_devolucion));
  const byAging = groupSum(data, (row) => {
    const days = daysSince(row.fecha_presentacion_afp || row.last_activity_at || row.updated_at || row.created_at);
    if (days <= 7) return "0 a 7 días";
    if (days <= 15) return "8 a 15 días";
    if (days <= 30) return "16 a 30 días";
    if (days <= 60) return "31 a 60 días";
    return "+60 días";
  }, (row) => numberValue(row.monto_devolucion));
  const recent = [...data].sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))).slice(0, 12);
  const highPriority = [...data]
    .filter((row) => numberValue(row.monto_devolucion) >= 500000 || daysSince(row.fecha_presentacion_afp || row.updated_at || row.created_at) > 20 || row.confirmacion_poder === false || row.confirmacion_cc === false)
    .sort((a, b) => numberValue(b.monto_devolucion) - numberValue(a.monto_devolucion))
    .slice(0, 8);

  return (
    <div className="zoho-module-page dashboard-page">
      <div className="zoho-module-header">
        <div>
          <h1>Dashboard ejecutivo</h1>
          <p>Control de recuperación por mandante, AFP, estado, antigüedad, prioridad y meta mensual.</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn" onClick={() => exportCsv("operafix_dashboard.csv", data, selectedColumns)}>Exportar CSV</button>
          <button className="zoho-btn" onClick={() => setColumnModalOpen(true)}>Campos / columnas</button>
          <button className="zoho-btn" onClick={load}>Actualizar</button>
        </div>
      </div>

      <section className="dashboard-filter-card">
        <select className="zoho-select" value={mandante} onChange={(e) => setMandante(e.target.value)}>
          <option value="todos">Todos los mandantes</option>
          {mandantes.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select className="zoho-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          {estados.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select className="zoho-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="todos">LM + TP</option>
          <option value="LM">Solo LM</option>
          <option value="TP">Solo TP</option>
        </select>
        <label className="dashboard-goal-input">
          <span>Meta mensual CLP</span>
          <input className="zoho-input" type="number" value={metaMensual} onChange={(e) => setMetaMensual(Number(e.target.value || 0))} />
        </label>
      </section>

      <div className="dashboard-advanced-layout">
        <ModuleFilterPanel
          title="Filtrar dashboard por cualquier campo"
          fields={recordFilterFields}
          onApply={(rules, search) => {
            setActiveRules(rules);
            setQuickSearch(search);
          }}
        />
        <div className="dashboard-filter-help">
          <strong>Campos disponibles:</strong> puedes filtrar por mandante, AFP, RUT, montos, fechas, facturación, CEN, poder, CC, estado, documentos y más.
        </div>
      </div>

      {loading ? <div className="zoho-empty">Cargando dashboard...</div> : (
        <>
          <section className="dashboard-kpi-grid">
            <Kpi title="Total devolución" value={money(totalDevolucion)} helper="Monto total estimado/gestionado" />
            <Kpi title="Avance meta" value={`${avanceMeta.toFixed(1)}%`} helper={`${money(totalDevolucion)} de ${money(metaMensual)}`} progress={avanceMeta} />
            <Kpi title="Finanfix" value={money(totalFinanfix)} helper="Monto real/estimado Finanfix" />
            <Kpi title="Cliente" value={money(totalCliente)} helper="Monto real/estimado cliente" />
            <Kpi title="Pendientes" value={String(pendientes)} helper="Gestiones abiertas" />
            <Kpi title="Pagadas/Cerradas" value={String(pagadas)} helper="Gestiones con cierre positivo" />
            <Kpi title="Rechazadas" value={String(rechazadas)} helper="Gestiones rechazadas" />
          </section>

          <section className="dashboard-grid-3">
            <Ranking title="Monto por mandante" rows={byMandante.slice(0, 8)} />
            <Ranking title="Monto por AFP / entidad" rows={byEntidad.slice(0, 8)} />
            <Ranking title="Estados de gestión" rows={byEstado.slice(0, 8)} />
            <Ranking title="Antigüedad operacional" rows={byAging} />
          </section>

          <section className="dashboard-grid-2">
            <div className="zoho-card">
              <div className="zoho-card-title-row"><h2>Gestiones prioritarias</h2><button className="zoho-btn" onClick={() => navigate("/ia-gestiones")}>Ver IA</button></div>
              <table className="zoho-table compact">
                <thead><tr><th>Empresa</th><th>AFP</th><th>Estado</th><th>Monto</th><th>Alerta</th></tr></thead>
                <tbody>{highPriority.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/records/${row.id}`)} className="clickable-row">
                    <td>{row.razon_social || row.company?.razon_social || "—"}</td>
                    <td>{row.entidad || row.lineAfp?.afp_name || "—"}</td>
                    <td><span className="status-pill">{row.estado_gestion || "—"}</span></td>
                    <td>{money(numberValue(row.monto_devolucion))}</td>
                    <td>{row.confirmacion_poder === false ? "Poder" : row.confirmacion_cc === false ? "CC" : daysSince(row.fecha_presentacion_afp || row.updated_at || row.created_at) > 20 ? "+20 días" : "Monto alto"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div className="zoho-card">
              <div className="zoho-card-title-row"><h2>Últimas gestiones actualizadas</h2></div>
              <table className="zoho-table compact">
                <thead><tr><th>Mandante</th><th>Razón Social</th><th>AFP</th><th>Estado</th><th>Monto</th></tr></thead>
                <tbody>{recent.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/records/${row.id}`)} className="clickable-row">
                    <td>{row.mandante?.name || (row as any).mandante || "—"}</td>
                    <td>{row.razon_social || row.company?.razon_social || "—"}</td>
                    <td>{row.entidad || row.lineAfp?.afp_name || "—"}</td>
                    <td><span className="status-pill">{row.estado_gestion || "—"}</span></td>
                    <td>{money(numberValue(row.monto_devolucion))}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="zoho-card dashboard-records-card">
            <div className="zoho-card-title-row">
              <h2>Detalle dinámico del dashboard</h2>
              <button className="zoho-btn" onClick={() => setColumnModalOpen(true)}>Elegir campos</button>
            </div>
            <div className="zoho-table-scroll">
              <table className="zoho-table compact">
                <thead>
                  <tr>
                    {selectedColumns.map((column) => <th key={column.field}>{column.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id} className="clickable-row" onClick={() => navigate(`/records/${row.id}`)}>
                      {selectedColumns.map((column) => <td key={`${row.id}-${column.field}`}>{formatCellValue(column.value(row), column)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <ZohoModal title="Campos visibles del dashboard" isOpen={columnModalOpen} onClose={() => setColumnModalOpen(false)}>
        <div className="column-picker-actions">
          <button className="zoho-btn" onClick={selectAllColumns}>Mostrar todos</button>
          <button className="zoho-btn" onClick={resetColumns}>Vista estándar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setColumnModalOpen(false)}>Aplicar</button>
        </div>
        <div className="column-order-help">
          Marca los campos que quieres ver y usa ← / → para definir el orden en la tabla.
        </div>
        <div className="column-picker-grid column-picker-grid-orderable">
          {recordColumns.map((column) => {
            const isVisible = visibleColumns.includes(column.field);
            const position = visibleColumns.indexOf(column.field);
            return (
              <div key={column.field} className={"column-picker-item column-picker-order-item " + (isVisible ? "active" : "")}>
                <label>
                  <input type="checkbox" checked={isVisible} onChange={() => toggleColumn(column.field)} />
                  <span>{column.label}</span>
                </label>
                <div className="column-order-controls">
                  <span className="column-position">{isVisible ? position + 1 : "—"}</span>
                  <button className="mini-order-btn" type="button" disabled={!isVisible || position <= 0} onClick={() => moveColumn(column.field, "left")}>←</button>
                  <button className="mini-order-btn" type="button" disabled={!isVisible || position === visibleColumns.length - 1} onClick={() => moveColumn(column.field, "right")}>→</button>
                </div>
              </div>
            );
          })}
        </div>
      </ZohoModal>
    </div>
  );
}

function Kpi({ title, value, helper, progress }: { title: string; value: string; helper: string; progress?: number }) {
  return <div className="dashboard-kpi"><span>{title}</span><strong>{value}</strong><small>{helper}</small>{progress !== undefined && <div className="dashboard-progress"><div style={{ width: `${Math.max(2, Math.min(100, progress))}%` }} /></div>}</div>;
}

function Ranking({ title, rows }: { title: string; rows: { name: string; count: number; amount: number }[] }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return (
    <div className="zoho-card ranking-card">
      <div className="zoho-card-title-row"><h2>{title}</h2></div>
      {rows.length === 0 ? <div className="zoho-empty small">Sin datos</div> : rows.map((row) => (
        <div className="ranking-row" key={row.name}>
          <div className="ranking-head"><strong>{row.name}</strong><span>{money(row.amount)} · {row.count}</span></div>
          <div className="ranking-bar"><div style={{ width: `${Math.max(6, (row.amount / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
