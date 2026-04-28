import { useEffect, useMemo, useState, type DragEvent } from "react";
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

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matchRule(value: unknown, rule: FilterRule) {
  const normalized = normalize(value);
  const query = normalize(rule.value);

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

type DashboardScopedSettings = {
  activeRules: FilterRule[];
  quickSearch: string;
  visibleColumns: string[];
  columnOrder: string[];
};

type PanelFilter = { id: string; field: string; operator: "equals" | "contains" | "not_equals"; value: string };
type PanelChartType = "table" | "bar" | "pie" | "kpi";
type PanelMetric = "count" | "monto_devolucion" | "monto_real_finanfix_solutions" | "monto_real_cliente" | "monto_cliente" | "monto_finanfix_solutions";
type PanelConfig = {
  id: string;
  title: string;
  chartType: PanelChartType;
  metric: PanelMetric;
  groupFields: string[];
  filters: PanelFilter[];
};

type PanelDraft = Omit<PanelConfig, "id">;

const metricOptions: { value: PanelMetric; label: string; type: "number" | "money" }[] = [
  { value: "count", label: "Cantidad de registros", type: "number" },
  { value: "monto_devolucion", label: "Suma Monto Devolución", type: "money" },
  { value: "monto_real_finanfix_solutions", label: "Suma Monto Real Finanfix", type: "money" },
  { value: "monto_real_cliente", label: "Suma Monto Real Cliente", type: "money" },
  { value: "monto_cliente", label: "Suma Monto Cliente", type: "money" },
  { value: "monto_finanfix_solutions", label: "Suma Monto Finanfix", type: "money" },
];

const chartTypeOptions: { value: PanelChartType; label: string }[] = [
  { value: "table", label: "Tabla dinámica" },
  { value: "bar", label: "Gráfico de barras" },
  { value: "pie", label: "Gráfico circular" },
  { value: "kpi", label: "Indicador KPI" },
];

const defaultPanels: PanelConfig[] = [
  {
    id: "panel-afp-monto",
    title: "Monto por AFP / Entidad",
    chartType: "pie",
    metric: "monto_devolucion",
    groupFields: ["entidad"],
    filters: [],
  },
  {
    id: "panel-colaboradores",
    title: "Colaboradores por mandante",
    chartType: "table",
    metric: "count",
    groupFields: ["mandante", "propietario"],
    filters: [],
  },
  {
    id: "panel-facturacion",
    title: "Estado de pago facturas",
    chartType: "table",
    metric: "monto_real_finanfix_solutions",
    groupFields: ["facturado_finanfix", "fecha_factura_finanfix"],
    filters: [],
  },
];

function dashboardScopedKey(mandante: string) {
  return `operafix_dashboard_scoped_settings_v30_${mandante || "todos"}`;
}

function dashboardPanelsKey(mandante: string) {
  return `operafix_dashboard_panels_v30_${mandante || "todos"}`;
}

function cleanDashboardColumns(fields: unknown) {
  if (!Array.isArray(fields)) return defaultRecordColumnFields;
  const clean = fields.filter((field) => typeof field === "string" && recordColumns.some((column) => column.field === field));
  return clean.length ? clean : defaultRecordColumnFields;
}

function cleanDashboardColumnOrder(fields: unknown) {
  const allFields = recordColumns.map((column) => column.field);
  if (!Array.isArray(fields)) return allFields;
  const clean = fields.filter((field) => typeof field === "string" && allFields.includes(field));
  const missing = allFields.filter((field) => !clean.includes(field));
  return [...clean, ...missing];
}

function readDashboardScopedSettings(mandante: string): DashboardScopedSettings {
  try {
    const saved = localStorage.getItem(dashboardScopedKey(mandante));
    if (!saved) return { activeRules: [], quickSearch: "", visibleColumns: defaultRecordColumnFields, columnOrder: cleanDashboardColumnOrder(null) };
    const parsed = JSON.parse(saved);
    return {
      activeRules: Array.isArray(parsed?.activeRules) ? parsed.activeRules : [],
      quickSearch: typeof parsed?.quickSearch === "string" ? parsed.quickSearch : "",
      visibleColumns: cleanDashboardColumns(parsed?.visibleColumns),
      columnOrder: cleanDashboardColumnOrder(parsed?.columnOrder),
    };
  } catch {
    return { activeRules: [], quickSearch: "", visibleColumns: defaultRecordColumnFields, columnOrder: cleanDashboardColumnOrder(null) };
  }
}

function saveDashboardScopedSettings(mandante: string, settings: DashboardScopedSettings) {
  localStorage.setItem(dashboardScopedKey(mandante), JSON.stringify({
    activeRules: settings.activeRules || [],
    quickSearch: settings.quickSearch || "",
    visibleColumns: cleanDashboardColumns(settings.visibleColumns),
    columnOrder: cleanDashboardColumnOrder(settings.columnOrder),
  }));
}

function readDashboardPanels(mandante: string): PanelConfig[] {
  try {
    const saved = localStorage.getItem(dashboardPanelsKey(mandante));
    if (!saved) return defaultPanels;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaultPanels;
    const allowedFields = new Set(recordColumns.map((column) => column.field));
    return parsed
      .filter((panel) => panel && typeof panel.title === "string")
      .map((panel) => ({
        id: String(panel.id || crypto.randomUUID()),
        title: String(panel.title || "Panel"),
        chartType: chartTypeOptions.some((item) => item.value === panel.chartType) ? panel.chartType : "table",
        metric: metricOptions.some((item) => item.value === panel.metric) ? panel.metric : "count",
        groupFields: Array.isArray(panel.groupFields) ? panel.groupFields.filter((field: string) => allowedFields.has(field)).slice(0, 3) : [],
        filters: Array.isArray(panel.filters) ? panel.filters.filter((rule: PanelFilter) => rule?.field && allowedFields.has(rule.field)) : [],
      })) as PanelConfig[];
  } catch {
    return defaultPanels;
  }
}

function saveDashboardPanels(mandante: string, panels: PanelConfig[]) {
  localStorage.setItem(dashboardPanelsKey(mandante), JSON.stringify(panels));
}

function fieldLabel(field: string) {
  return recordColumns.find((column) => column.field === field)?.label || field;
}

function metricLabel(metric: PanelMetric) {
  return metricOptions.find((item) => item.value === metric)?.label || metric;
}

function metricType(metric: PanelMetric) {
  return metricOptions.find((item) => item.value === metric)?.type || "number";
}

function formatMetric(value: number, metric: PanelMetric) {
  return metricType(metric) === "money" ? money(value) : new Intl.NumberFormat("es-CL").format(value || 0);
}

function getColumnValue(row: RecordItem, field: string) {
  const column = recordColumns.find((item) => item.field === field);
  if (column) return column.value(row);
  return getValueByPath(row, field);
}

function formatGroupValue(row: RecordItem, field: string) {
  const column = recordColumns.find((item) => item.field === field);
  const value = getColumnValue(row, field);
  if (column?.money) return formatCellValue(value, column);
  if (column?.type === "date") return formatCellValue(value, column);
  if (column?.type === "boolean") return formatCellValue(value, column);
  return keyText(value, "Sin asignar");
}

function metricValue(row: RecordItem, metric: PanelMetric) {
  if (metric === "count") return 1;
  return numberValue(getColumnValue(row, metric));
}

function applyPanelFilters(rows: RecordItem[], filters: PanelFilter[]) {
  if (!filters.length) return rows;
  return rows.filter((row) => filters.every((rule) => {
    const value = getColumnValue(row, rule.field);
    const left = normalize(value);
    const right = normalize(rule.value);
    if (!right) return true;
    if (rule.operator === "equals") return left === right;
    if (rule.operator === "not_equals") return left !== right;
    return left.includes(right);
  }));
}

function buildPanelRows(rows: RecordItem[], panel: PanelConfig) {
  const filtered = applyPanelFilters(rows, panel.filters);
  if (panel.chartType === "kpi" || !panel.groupFields.length) {
    return [{ labels: [panel.title], key: panel.title, count: filtered.length, value: filtered.reduce((sum, row) => sum + metricValue(row, panel.metric), 0) }];
  }

  const map = new Map<string, { labels: string[]; key: string; count: number; value: number }>();
  filtered.forEach((row) => {
    const labels = panel.groupFields.map((field) => formatGroupValue(row, field));
    const key = labels.join("||");
    const current = map.get(key) || { labels, key, count: 0, value: 0 };
    current.count += 1;
    current.value += metricValue(row, panel.metric);
    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => b.value - a.value || b.count - a.count);
}

function blankPanelDraft(mandante: string): PanelDraft {
  return {
    title: mandante === "todos" ? "Nuevo panel" : `Nuevo panel - ${mandante}`,
    chartType: "table",
    metric: "count",
    groupFields: ["mandante"],
    filters: mandante === "todos" ? [] : [{ id: crypto.randomUUID(), field: "mandante", operator: "equals", value: mandante }],
  };
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
  const [panelModalOpen, setPanelModalOpen] = useState(false);
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const initialDashboardSettings = readDashboardScopedSettings("todos");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => initialDashboardSettings.visibleColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => initialDashboardSettings.columnOrder);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [metaMensual, setMetaMensual] = useState(83000000);
  const [panels, setPanels] = useState<PanelConfig[]>(() => readDashboardPanels("todos"));
  const [panelDraft, setPanelDraft] = useState<PanelDraft>(() => blankPanelDraft("todos"));

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
    saveDashboardScopedSettings(mandante, { activeRules, quickSearch, visibleColumns, columnOrder });
    saveDashboardPanels(mandante, panels);
  }, [mandante, activeRules, quickSearch, visibleColumns, columnOrder, panels]);

  function switchMandante(nextMandante: string) {
    saveDashboardScopedSettings(mandante, { activeRules, quickSearch, visibleColumns, columnOrder });
    saveDashboardPanels(mandante, panels);
    const nextSettings = readDashboardScopedSettings(nextMandante);
    setActiveRules(nextSettings.activeRules);
    setQuickSearch(nextSettings.quickSearch);
    setVisibleColumns(nextSettings.visibleColumns);
    setColumnOrder(nextSettings.columnOrder);
    setPanels(readDashboardPanels(nextMandante));
    setMandante(nextMandante);
  }

  const mandantes = useMemo(() => Array.from(new Set(rows.map((row) => keyText(row.mandante?.name || (row as any).mandante, "Sin mandante")))).sort(), [rows]);
  const estados = useMemo(() => Array.from(new Set(rows.map((row) => keyText(row.estado_gestion, "Sin estado")))).sort(), [rows]);

  const selectedColumns = useMemo(() => {
    return columnOrder
      .filter((field) => visibleColumns.includes(field))
      .map((field) => recordColumns.find((column) => column.field === field))
      .filter(Boolean) as RecordColumnDefinition[];
  }, [visibleColumns, columnOrder]);

  function toggleColumn(field: string) {
    setVisibleColumns((prev) => prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]);
  }

  const orderedRecordColumns = useMemo(() => {
    return columnOrder
      .map((field) => recordColumns.find((column) => column.field === field))
      .filter(Boolean) as RecordColumnDefinition[];
  }, [columnOrder]);

  function reorderColumn(activeField: string, overField: string) {
    if (!activeField || !overField || activeField === overField) return;
    setColumnOrder((prev) => {
      const current = cleanDashboardColumnOrder(prev);
      const fromIndex = current.indexOf(activeField);
      const toIndex = current.indexOf(overField);
      if (fromIndex === -1 || toIndex === -1) return current;
      const next = [...current];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }

  function handleColumnDragStart(field: string) { setDraggedColumn(field); }
  function handleColumnDragOver(event: DragEvent<HTMLDivElement>) { event.preventDefault(); }
  function handleColumnDrop(targetField: string) { if (draggedColumn) reorderColumn(draggedColumn, targetField); setDraggedColumn(null); }
  function resetColumns() { setVisibleColumns(defaultRecordColumnFields); setColumnOrder(cleanDashboardColumnOrder(null)); }
  function selectAllColumns() { setVisibleColumns(recordColumns.map((column) => column.field)); setColumnOrder(cleanDashboardColumnOrder(columnOrder)); }

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

    if (activeRules.length) return activeRules.every((rule) => matchRule(getValueByPath(row, rule.field), rule));
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

  function openNewPanel() {
    setEditingPanelId(null);
    setPanelDraft(blankPanelDraft(mandante));
    setPanelModalOpen(true);
  }

  function editPanel(panel: PanelConfig) {
    setEditingPanelId(panel.id);
    setPanelDraft({ title: panel.title, chartType: panel.chartType, metric: panel.metric, groupFields: [...panel.groupFields], filters: [...panel.filters] });
    setPanelModalOpen(true);
  }

  function savePanel() {
    const cleanedDraft: PanelDraft = {
      ...panelDraft,
      title: panelDraft.title.trim() || "Panel sin nombre",
      groupFields: panelDraft.chartType === "kpi" ? [] : panelDraft.groupFields.filter(Boolean).slice(0, 3),
      filters: panelDraft.filters.filter((rule) => rule.field && rule.value.trim()),
    };

    if (editingPanelId) {
      setPanels((prev) => prev.map((panel) => panel.id === editingPanelId ? { id: panel.id, ...cleanedDraft } : panel));
    } else {
      setPanels((prev) => [{ id: crypto.randomUUID(), ...cleanedDraft }, ...prev]);
    }
    setPanelModalOpen(false);
  }

  function deletePanel(panelId: string) {
    if (!confirm("¿Eliminar este panel del dashboard?")) return;
    setPanels((prev) => prev.filter((panel) => panel.id !== panelId));
  }

  function addPanelFilter() {
    setPanelDraft((prev) => ({ ...prev, filters: [...prev.filters, { id: crypto.randomUUID(), field: "mandante", operator: "equals", value: "" }] }));
  }

  function updatePanelFilter(id: string, patch: Partial<PanelFilter>) {
    setPanelDraft((prev) => ({ ...prev, filters: prev.filters.map((rule) => rule.id === id ? { ...rule, ...patch } : rule) }));
  }

  function removePanelFilter(id: string) {
    setPanelDraft((prev) => ({ ...prev, filters: prev.filters.filter((rule) => rule.id !== id) }));
  }

  function updateGroupField(index: number, field: string) {
    setPanelDraft((prev) => {
      const next = [...prev.groupFields];
      next[index] = field;
      return { ...prev, groupFields: next.filter(Boolean).slice(0, 3) };
    });
  }

  function addGroupField() {
    setPanelDraft((prev) => prev.groupFields.length >= 3 ? prev : { ...prev, groupFields: [...prev.groupFields, "estado_gestion"] });
  }

  function removeGroupField(index: number) {
    setPanelDraft((prev) => ({ ...prev, groupFields: prev.groupFields.filter((_, i) => i !== index) }));
  }

  return (
    <div className="zoho-module-page dashboard-page">
      <div className="zoho-module-header">
        <div>
          <h1>Dashboard ejecutivo</h1>
          <p>Control de recuperación por mandante, AFP, estado, antigüedad, prioridad y paneles personalizados.</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn" onClick={() => exportCsv("operafix_dashboard.csv", data, selectedColumns)}>Exportar CSV</button>
          <button className="zoho-btn" onClick={() => setColumnModalOpen(true)}>Campos / columnas</button>
          <button className="zoho-btn zoho-btn-primary" onClick={openNewPanel}>Crear panel</button>
          <button className="zoho-btn" onClick={load}>Actualizar</button>
        </div>
      </div>

      <section className="dashboard-filter-card">
        <select className="zoho-select" value={mandante} onChange={(e) => switchMandante(e.target.value)}>
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

      <div className="zoho-scope-hint">Los filtros, columnas y paneles personalizados se guardan por mandante seleccionado.</div>

      <div className="dashboard-advanced-layout">
        <ModuleFilterPanel
          title="Filtrar dashboard por cualquier campo"
          fields={recordFilterFields}
          onApply={(rules, search) => { setActiveRules(rules); setQuickSearch(search); }}
        />
        <div className="dashboard-filter-help">
          <strong>Constructor de paneles:</strong> usa Crear panel para armar gráficos o tablas como Zoho, seleccionando medida, agrupaciones y filtros propios.
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

          <section className="dashboard-builder-section">
            <div className="zoho-card-title-row dashboard-builder-title">
              <div>
                <h2>Paneles personalizados</h2>
                <p>Crea paneles según los datos y filtros que selecciones, igual que los reportes de análisis.</p>
              </div>
              <button className="zoho-btn zoho-btn-primary" onClick={openNewPanel}>Agregar componente</button>
            </div>
            {panels.length === 0 ? <div className="zoho-empty">No tienes paneles creados para esta vista.</div> : (
              <div className="dashboard-custom-grid">
                {panels.map((panel) => <CustomPanel key={panel.id} panel={panel} rows={data} onEdit={editPanel} onDelete={deletePanel} onOpenRecord={(id) => navigate(`/records/${id}`)} />)}
              </div>
            )}
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
                <thead><tr>{selectedColumns.map((column) => <th key={column.field}>{column.label}</th>)}</tr></thead>
                <tbody>{data.map((row) => (
                  <tr key={row.id} className="clickable-row" onClick={() => navigate(`/records/${row.id}`)}>
                    {selectedColumns.map((column) => <td key={`${row.id}-${column.field}`}>{formatCellValue(column.value(row), column)}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <ZohoModal title={editingPanelId ? "Editar panel" : "Crear panel del dashboard"} isOpen={panelModalOpen} onClose={() => setPanelModalOpen(false)}>
        <div className="dashboard-panel-editor">
          <div className="panel-editor-form">
            <label>Nombre del componente
              <input className="zoho-input" value={panelDraft.title} onChange={(e) => setPanelDraft((prev) => ({ ...prev, title: e.target.value }))} />
            </label>
            <label>Tipo de gráfico
              <select className="zoho-select" value={panelDraft.chartType} onChange={(e) => setPanelDraft((prev) => ({ ...prev, chartType: e.target.value as PanelChartType }))}>
                {chartTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>Medida
              <select className="zoho-select" value={panelDraft.metric} onChange={(e) => setPanelDraft((prev) => ({ ...prev, metric: e.target.value as PanelMetric }))}>
                {metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            {panelDraft.chartType !== "kpi" && <div className="panel-editor-block">
              <div className="panel-editor-title-row"><strong>Agrupamiento</strong><button className="zoho-btn small" onClick={addGroupField} disabled={panelDraft.groupFields.length >= 3}>Agregar campo</button></div>
              {panelDraft.groupFields.map((field, index) => (
                <div className="panel-editor-row" key={`${field}-${index}`}>
                  <select className="zoho-select" value={field} onChange={(e) => updateGroupField(index, e.target.value)}>
                    {recordColumns.map((column) => <option key={column.field} value={column.field}>{column.label}</option>)}
                  </select>
                  <button className="zoho-btn danger small" onClick={() => removeGroupField(index)}>Quitar</button>
                </div>
              ))}
            </div>}

            <div className="panel-editor-block">
              <div className="panel-editor-title-row"><strong>Criterios de filtro</strong><button className="zoho-btn small" onClick={addPanelFilter}>Agregar filtro</button></div>
              {panelDraft.filters.length === 0 && <div className="zoho-empty small">Sin filtros propios para este panel.</div>}
              {panelDraft.filters.map((rule) => (
                <div className="panel-editor-row" key={rule.id}>
                  <select className="zoho-select" value={rule.field} onChange={(e) => updatePanelFilter(rule.id, { field: e.target.value })}>
                    {recordColumns.map((column) => <option key={column.field} value={column.field}>{column.label}</option>)}
                  </select>
                  <select className="zoho-select short" value={rule.operator} onChange={(e) => updatePanelFilter(rule.id, { operator: e.target.value as PanelFilter["operator"] })}>
                    <option value="equals">es</option>
                    <option value="contains">contiene</option>
                    <option value="not_equals">no es</option>
                  </select>
                  <input className="zoho-input" value={rule.value} onChange={(e) => updatePanelFilter(rule.id, { value: e.target.value })} placeholder="Valor" />
                  <button className="zoho-btn danger small" onClick={() => removePanelFilter(rule.id)}>Eliminar</button>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-editor-preview">
            <CustomPanel panel={{ id: "preview", ...panelDraft }} rows={data} preview onEdit={() => undefined} onDelete={() => undefined} onOpenRecord={() => undefined} />
          </div>
        </div>
        <div className="column-picker-actions">
          <button className="zoho-btn" onClick={() => setPanelModalOpen(false)}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={savePanel}>Guardar</button>
        </div>
      </ZohoModal>

      <ZohoModal title="Campos visibles del dashboard" isOpen={columnModalOpen} onClose={() => setColumnModalOpen(false)}>
        <div className="column-picker-actions">
          <button className="zoho-btn" onClick={selectAllColumns}>Mostrar todos</button>
          <button className="zoho-btn" onClick={resetColumns}>Vista estándar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setColumnModalOpen(false)}>Aplicar</button>
        </div>
        <div className="column-order-help">Marca los campos que quieres ver y arrastra cada cuadro para definir el orden en la tabla.</div>
        <div className="column-picker-grid column-picker-grid-orderable">
          {orderedRecordColumns.map((column) => {
            const isVisible = visibleColumns.includes(column.field);
            const visiblePosition = columnOrder.filter((field) => visibleColumns.includes(field)).indexOf(column.field);
            return (
              <div
                key={column.field}
                className={"column-picker-item column-picker-order-item draggable-column-item " + (isVisible ? "active" : "") + (draggedColumn === column.field ? " dragging" : "")}
                draggable
                onDragStart={() => handleColumnDragStart(column.field)}
                onDragOver={handleColumnDragOver}
                onDrop={() => handleColumnDrop(column.field)}
                onDragEnd={() => setDraggedColumn(null)}
                title="Arrastra este campo para cambiar su posición"
              >
                <span className="drag-handle" aria-hidden="true">☰</span>
                <label><input type="checkbox" checked={isVisible} onChange={() => toggleColumn(column.field)} /><span>{column.label}</span></label>
                <div className="column-order-controls"><span className="column-position">{isVisible ? visiblePosition + 1 : "—"}</span></div>
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

function CustomPanel({ panel, rows, preview, onEdit, onDelete, onOpenRecord }: { panel: PanelConfig; rows: RecordItem[]; preview?: boolean; onEdit: (panel: PanelConfig) => void; onDelete: (panelId: string) => void; onOpenRecord: (recordId: string) => void }) {
  const panelRows = buildPanelRows(rows, panel);
  const filtered = applyPanelFilters(rows, panel.filters);
  const max = Math.max(...panelRows.map((row) => row.value), 1);
  const total = panelRows.reduce((sum, row) => sum + row.value, 0);
  const previewRows = panelRows.slice(0, panel.chartType === "pie" ? 8 : 12);
  const metricText = metricLabel(panel.metric);

  return (
    <div className={`zoho-card custom-dashboard-panel panel-${panel.chartType}`}>
      <div className="custom-panel-header">
        <div>
          <h3>{panel.title}</h3>
          <small>{metricText}{panel.groupFields.length ? ` por ${panel.groupFields.map(fieldLabel).join(" / ")}` : ""}</small>
        </div>
        {!preview && <div className="custom-panel-actions">
          <button className="zoho-btn small" onClick={() => onEdit(panel)}>Editar</button>
          <button className="zoho-btn danger small" onClick={() => onDelete(panel.id)}>Eliminar</button>
        </div>}
      </div>

      {panel.chartType === "kpi" && <div className="custom-kpi-big"><strong>{formatMetric(total, panel.metric)}</strong><span>{filtered.length} registros considerados</span></div>}

      {panel.chartType === "bar" && <div className="custom-bar-chart">
        {previewRows.map((row) => <div className="custom-bar-row" key={row.key}>
          <div className="custom-bar-label"><strong>{row.labels.join(" / ")}</strong><span>{formatMetric(row.value, panel.metric)}</span></div>
          <div className="custom-bar-track"><div style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} /></div>
        </div>)}
      </div>}

      {panel.chartType === "pie" && <PieLikeChart rows={previewRows} metric={panel.metric} total={total} />}

      {panel.chartType === "table" && <div className="zoho-table-scroll custom-panel-table-scroll">
        <table className="zoho-table compact custom-panel-table">
          <thead><tr>{panel.groupFields.map((field) => <th key={field}>{fieldLabel(field)}</th>)}<th>{metricText}</th><th>Cantidad</th></tr></thead>
          <tbody>{previewRows.map((row) => (
            <tr key={row.key}>
              {row.labels.map((label, index) => <td key={`${row.key}-${index}`}>{label}</td>)}
              <td>{formatMetric(row.value, panel.metric)}</td>
              <td>{row.count}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>}

      {!preview && filtered.length > 0 && <details className="custom-panel-records">
        <summary>Ver registros utilizados ({filtered.length})</summary>
        <div className="custom-panel-record-list">
          {filtered.slice(0, 20).map((row) => <button key={row.id} onClick={() => onOpenRecord(row.id)}>{row.razon_social || row.company?.razon_social || row.rut || row.id}</button>)}
        </div>
      </details>}
    </div>
  );
}

function PieLikeChart({ rows, metric, total }: { rows: { key: string; labels: string[]; value: number; count: number }[]; metric: PanelMetric; total: number }) {
  const colors = ["#1f7ae0", "#ff6b3d", "#1fbf75", "#8b5cf6", "#f59e0b", "#06b6d4", "#ef4444", "#64748b"];
  let start = 0;
  const gradient = rows.map((row, index) => {
    const pct = total > 0 ? (row.value / total) * 100 : 0;
    const segment = `${colors[index % colors.length]} ${start}% ${start + pct}%`;
    start += pct;
    return segment;
  }).join(", ");
  return <div className="custom-pie-layout">
    <div className="custom-pie" style={{ background: `conic-gradient(${gradient || "#e5e7eb 0% 100%"})` }}><span>{formatMetric(total, metric)}</span></div>
    <div className="custom-pie-legend">
      {rows.map((row, index) => <div key={row.key}><i style={{ background: colors[index % colors.length] }} /> <span>{row.labels.join(" / ")}</span><strong>{formatMetric(row.value, metric)}</strong></div>)}
    </div>
  </div>;
}
