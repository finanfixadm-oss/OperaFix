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
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function stripAccents(value: unknown) {
  return normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

type PanelOperator = "equals" | "contains" | "not_equals" | "empty" | "not_empty" | "greater_than" | "less_than";
type PanelFilter = { id: string; field: string; operator: PanelOperator; value: string };
type PanelChartType = "table" | "bar" | "pie" | "kpi";
type MetricAggregation = "count" | "sum" | "avg" | "min" | "max";
type DatePart = "none" | "year" | "month" | "day";
type PanelGroupField = { id: string; field: string; datePart?: DatePart };
type PanelMetricConfig = { aggregation: MetricAggregation; field?: string };
type PanelConfig = {
  id: string;
  title: string;
  chartType: PanelChartType;
  module: string;
  relatedModule: string;
  metric: PanelMetricConfig;
  groupFields: PanelGroupField[];
  filters: PanelFilter[];
  criteriaMode: "AND" | "OR";
};

type PanelDraft = Omit<PanelConfig, "id">;

type PanelRow = { labels: string[]; key: string; count: number; value: number; rawValues: number[] };

const moduleOptions = [
  "Grupos de empresas - LM",
  "Registros de empresas",
  "Posibles clientes",
  "Contactos",
  "Tratos",
  "Tareas",
  "Reuniones",
  "Llamadas",
  "Presupuestos",
  "Órdenes de venta",
  "Facturas",
  "Casos",
  "Soluciones",
  "Previsiónes",
  "Visitas",
  "Notas",
  "Empresas",
  "Colaboradores",
  "Correos electrónicos",
  "Forecast Targets",
  "Forecast Items",
];

const chartTypeOptions: { value: PanelChartType; label: string }[] = [
  { value: "table", label: "Gráfico de tablas" },
  { value: "bar", label: "Gráfico de barras" },
  { value: "pie", label: "Gráfico circular" },
  { value: "kpi", label: "Indicador KPI" },
];

const moneyFieldAliases = new Set([
  "monto_devolucion",
  "monto_pagado",
  "monto_cliente",
  "monto_finanfix_solutions",
  "monto_real_cliente",
  "monto_real_finanfix_solutions",
  "fee",
]);

const numericColumns = recordColumns.filter((column) => column.type === "number" || column.money || moneyFieldAliases.has(column.field));
const dateColumns = recordColumns.filter((column) => column.type === "date");
const dimensionColumns = recordColumns.filter((column) => column.type !== "number" || !moneyFieldAliases.has(column.field));

const defaultPanels: PanelConfig[] = [
  {
    id: "panel-afp-monto",
    title: "Monto ganancia Finanfix Solutions por AFP",
    chartType: "pie",
    module: "Grupos de empresas - LM",
    relatedModule: "Registros de empresas",
    metric: { aggregation: "sum", field: "monto_real_finanfix_solutions" },
    groupFields: [{ id: "g1", field: "entidad" }],
    filters: [],
    criteriaMode: "AND",
  },
  {
    id: "panel-colaboradores",
    title: "Colaboradores por mandante",
    chartType: "table",
    module: "Grupos de empresas - LM",
    relatedModule: "Registros de empresas",
    metric: { aggregation: "count" },
    groupFields: [{ id: "g1", field: "mandante.name" }, { id: "g2", field: "owner_name" }],
    filters: [],
    criteriaMode: "AND",
  },
  {
    id: "panel-facturacion",
    title: "Estado de pago facturas",
    chartType: "table",
    module: "Grupos de empresas - LM",
    relatedModule: "Registros de empresas",
    metric: { aggregation: "sum", field: "monto_real_finanfix_solutions" },
    groupFields: [{ id: "g1", field: "facturado_cliente" }, { id: "g2", field: "fecha_pago_factura_finanfix", datePart: "year" }],
    filters: [],
    criteriaMode: "AND",
  },
];

function dashboardScopedKey(mandante: string) {
  return `operafix_dashboard_scoped_settings_v32_${mandante || "todos"}`;
}

function dashboardPanelsKey(mandante: string) {
  return `operafix_dashboard_panels_v32_${mandante || "todos"}`;
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

function normalizeMetric(raw: any): PanelMetricConfig {
  if (raw && typeof raw === "object" && raw.aggregation) {
    const aggregation: MetricAggregation = ["count", "sum", "avg", "min", "max"].includes(raw.aggregation) ? raw.aggregation : "count";
    const field = typeof raw.field === "string" && recordColumns.some((column) => column.field === raw.field) ? raw.field : undefined;
    return aggregation === "count" ? { aggregation: "count" } : { aggregation, field: field || "monto_devolucion" };
  }

  if (typeof raw === "string") {
    if (raw === "count") return { aggregation: "count" };
    if (recordColumns.some((column) => column.field === raw)) return { aggregation: "sum", field: raw };
  }

  return { aggregation: "count" };
}

function normalizeGroupFields(raw: any): PanelGroupField[] {
  const allowedFields = new Set(recordColumns.map((column) => column.field));
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (typeof item === "string") return { id: `g-${index}-${item}`, field: item, datePart: "none" as DatePart };
      return {
        id: String(item?.id || crypto.randomUUID()),
        field: String(item?.field || ""),
        datePart: ["none", "year", "month", "day"].includes(item?.datePart) ? item.datePart : "none",
      };
    })
    .filter((item) => allowedFields.has(item.field))
    .slice(0, 6);
}

function normalizeFilters(raw: any): PanelFilter[] {
  const allowedFields = new Set(recordColumns.map((column) => column.field));
  if (!Array.isArray(raw)) return [];
  return raw
    .map((rule) => ({
      id: String(rule?.id || crypto.randomUUID()),
      field: String(rule?.field || ""),
      operator: (["equals", "contains", "not_equals", "empty", "not_empty", "greater_than", "less_than"].includes(rule?.operator) ? rule.operator : "equals") as PanelOperator,
      value: String(rule?.value || ""),
    }))
    .filter((rule) => rule.field && allowedFields.has(rule.field));
}

function readDashboardPanels(mandante: string): PanelConfig[] {
  try {
    const saved = localStorage.getItem(dashboardPanelsKey(mandante));
    if (!saved) return defaultPanels;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaultPanels;
    return parsed
      .filter((panel) => panel && typeof panel.title === "string")
      .map((panel) => ({
        id: String(panel.id || crypto.randomUUID()),
        title: String(panel.title || "Panel"),
        chartType: chartTypeOptions.some((item) => item.value === panel.chartType) ? panel.chartType : "table",
        module: moduleOptions.includes(panel.module) ? panel.module : "Grupos de empresas - LM",
        relatedModule: moduleOptions.includes(panel.relatedModule) ? panel.relatedModule : "Registros de empresas",
        metric: normalizeMetric(panel.metric),
        groupFields: normalizeGroupFields(panel.groupFields),
        filters: normalizeFilters(panel.filters),
        criteriaMode: panel.criteriaMode === "OR" ? "OR" : "AND",
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

function fieldLongLabel(field: string) {
  return `${fieldLabel(field)} - Registros de empresas (Empresas del grupo)`;
}

function metricLabel(metric: PanelMetricConfig) {
  if (metric.aggregation === "count") return "Cantidad de registros";
  const prefix: Record<Exclude<MetricAggregation, "count">, string> = { sum: "Suma de", avg: "Promedio de", min: "Mínimo de", max: "Máximo de" };
  return `${prefix[metric.aggregation]} ${fieldLabel(metric.field || "monto_devolucion")}`;
}

function metricIsMoney(metric: PanelMetricConfig) {
  if (metric.aggregation === "count") return false;
  const column = recordColumns.find((item) => item.field === metric.field);
  return Boolean(column?.money || moneyFieldAliases.has(metric.field || ""));
}

function formatMetric(value: number, metric: PanelMetricConfig) {
  return metricIsMoney(metric) ? money(value) : new Intl.NumberFormat("es-CL").format(value || 0);
}

function getColumnValue(row: RecordItem, field: string) {
  const column = recordColumns.find((item) => item.field === field);
  if (column) return column.value(row);
  return getValueByPath(row, field);
}

function datePartValue(value: unknown, part?: DatePart) {
  if (!part || part === "none") return null;
  if (!value) return "Ninguno";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Ninguno";
  if (part === "year") return String(date.getFullYear());
  if (part === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return date.toLocaleDateString("es-CL");
}

function formatGroupValue(row: RecordItem, group: PanelGroupField) {
  const column = recordColumns.find((item) => item.field === group.field);
  const value = getColumnValue(row, group.field);
  const dateValue = datePartValue(value, group.datePart);
  if (dateValue) return dateValue;
  if (column?.money) return formatCellValue(value, column);
  if (column?.type === "date") return formatCellValue(value, column);
  if (column?.type === "boolean") return formatCellValue(value, column);
  return keyText(value, "Sin asignar");
}

function rawMetricValue(row: RecordItem, metric: PanelMetricConfig) {
  if (metric.aggregation === "count") return 1;
  return numberValue(getColumnValue(row, metric.field || "monto_devolucion"));
}

function aggregateMetric(values: number[], metric: PanelMetricConfig) {
  if (metric.aggregation === "count") return values.length;
  if (!values.length) return 0;
  if (metric.aggregation === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (metric.aggregation === "avg") return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (metric.aggregation === "min") return Math.min(...values);
  if (metric.aggregation === "max") return Math.max(...values);
  return 0;
}

function parseMultiValue(value: string) {
  return value.split(",").map((item) => stripAccents(item)).filter(Boolean);
}

function matchPanelFilter(row: RecordItem, rule: PanelFilter) {
  const value = getColumnValue(row, rule.field);
  const left = stripAccents(value);
  const right = stripAccents(rule.value);
  const list = parseMultiValue(rule.value);

  if (rule.operator === "empty") return !left;
  if (rule.operator === "not_empty") return Boolean(left);
  if (!right && !["empty", "not_empty"].includes(rule.operator)) return true;
  if (rule.operator === "equals") return list.length > 1 ? list.includes(left) : left === right;
  if (rule.operator === "not_equals") return list.length > 1 ? !list.includes(left) : left !== right;
  if (rule.operator === "contains") return list.length > 1 ? list.some((part) => left.includes(part)) : left.includes(right);
  if (rule.operator === "greater_than") return numberValue(value) > Number(rule.value || 0);
  if (rule.operator === "less_than") return numberValue(value) < Number(rule.value || 0);
  return true;
}

function applyPanelFilters(rows: RecordItem[], filters: PanelFilter[], criteriaMode: "AND" | "OR" = "AND") {
  const validFilters = filters.filter((rule) => rule.field && (rule.value.trim() || rule.operator === "empty" || rule.operator === "not_empty"));
  if (!validFilters.length) return rows;
  return rows.filter((row) => criteriaMode === "OR" ? validFilters.some((rule) => matchPanelFilter(row, rule)) : validFilters.every((rule) => matchPanelFilter(row, rule)));
}

function buildPanelRows(rows: RecordItem[], panel: PanelConfig) {
  const filtered = applyPanelFilters(rows, panel.filters, panel.criteriaMode);
  if (panel.chartType === "kpi" || !panel.groupFields.length) {
    const rawValues = filtered.map((row) => rawMetricValue(row, panel.metric));
    return [{ labels: [panel.title], key: panel.title, count: filtered.length, value: aggregateMetric(rawValues, panel.metric), rawValues }];
  }

  const map = new Map<string, PanelRow>();
  filtered.forEach((row) => {
    const labels = panel.groupFields.map((field) => formatGroupValue(row, field));
    const key = labels.join("||");
    const current = map.get(key) || { labels, key, count: 0, value: 0, rawValues: [] };
    current.count += 1;
    current.rawValues.push(rawMetricValue(row, panel.metric));
    current.value = aggregateMetric(current.rawValues, panel.metric);
    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => b.value - a.value || b.count - a.count || a.key.localeCompare(b.key));
}

function blankPanelDraft(mandante: string): PanelDraft {
  return {
    title: mandante === "todos" ? "Nuevo panel" : `Nuevo panel - ${mandante}`,
    chartType: "table",
    module: "Grupos de empresas - LM",
    relatedModule: "Registros de empresas",
    metric: { aggregation: "sum", field: "monto_real_finanfix_solutions" },
    groupFields: [{ id: crypto.randomUUID(), field: "facturado_cliente" }, { id: crypto.randomUUID(), field: "fecha_pago_factura_finanfix", datePart: "year" }],
    filters: mandante === "todos" ? [] : [{ id: crypto.randomUUID(), field: "mandante.name", operator: "equals", value: mandante }],
    criteriaMode: "AND",
  };
}

function filterPattern(filters: PanelFilter[], criteriaMode: "AND" | "OR") {
  const active = filters.filter((rule) => rule.field && (rule.value.trim() || rule.operator === "empty" || rule.operator === "not_empty"));
  if (!active.length) return "Sin patrón";
  const joiner = criteriaMode === "OR" ? " o " : " y ";
  return `( ${active.map((_, index) => index + 1).join(joiner)} )`;
}

function moduleSupported(module: string) {
  return ["Grupos de empresas - LM", "Registros de empresas", "Empresas", "Colaboradores", "Notas", "Correos electrónicos"].includes(module);
}

function operatorLabel(operator: PanelOperator) {
  const map: Record<PanelOperator, string> = {
    equals: "es",
    contains: "contiene",
    not_equals: "no es",
    empty: "está vacío",
    not_empty: "no está vacío",
    greater_than: "mayor que",
    less_than: "menor que",
  };
  return map[operator];
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
    setPanelDraft({
      title: panel.title,
      chartType: panel.chartType,
      module: panel.module,
      relatedModule: panel.relatedModule,
      metric: { ...panel.metric },
      groupFields: panel.groupFields.map((group) => ({ ...group })),
      filters: panel.filters.map((rule) => ({ ...rule })),
      criteriaMode: panel.criteriaMode,
    });
    setPanelModalOpen(true);
  }

  function savePanel() {
    const cleanedDraft: PanelDraft = {
      ...panelDraft,
      title: panelDraft.title.trim() || "Panel sin nombre",
      groupFields: panelDraft.chartType === "kpi" ? [] : panelDraft.groupFields.filter((group) => group.field).slice(0, 6),
      filters: panelDraft.filters.filter((rule) => rule.field && (rule.value.trim() || rule.operator === "empty" || rule.operator === "not_empty")),
      metric: panelDraft.metric.aggregation === "count" ? { aggregation: "count" } : { aggregation: panelDraft.metric.aggregation, field: panelDraft.metric.field || "monto_devolucion" },
    };

    if (editingPanelId) {
      setPanels((prev) => prev.map((panel) => panel.id === editingPanelId ? { id: panel.id, ...cleanedDraft } : panel));
    } else {
      setPanels((prev) => [{ id: crypto.randomUUID(), ...cleanedDraft }, ...prev]);
    }
    setPanelModalOpen(false);
  }

  function clonePanel(panel: PanelConfig) {
    setPanels((prev) => [{ ...panel, id: crypto.randomUUID(), title: `${panel.title} (copia)` }, ...prev]);
  }

  function deletePanel(panelId: string) {
    if (!confirm("¿Eliminar este panel del dashboard?")) return;
    setPanels((prev) => prev.filter((panel) => panel.id !== panelId));
  }

  function addPanelFilter() {
    setPanelDraft((prev) => ({ ...prev, filters: [...prev.filters, { id: crypto.randomUUID(), field: "mandante.name", operator: "equals", value: "" }] }));
  }

  function updatePanelFilter(id: string, patch: Partial<PanelFilter>) {
    setPanelDraft((prev) => ({ ...prev, filters: prev.filters.map((rule) => rule.id === id ? { ...rule, ...patch } : rule) }));
  }

  function removePanelFilter(id: string) {
    setPanelDraft((prev) => ({ ...prev, filters: prev.filters.filter((rule) => rule.id !== id) }));
  }

  function updateGroupField(id: string, patch: Partial<PanelGroupField>) {
    setPanelDraft((prev) => ({ ...prev, groupFields: prev.groupFields.map((group) => group.id === id ? { ...group, ...patch } : group) }));
  }

  function addGroupField() {
    setPanelDraft((prev) => prev.groupFields.length >= 6 ? prev : { ...prev, groupFields: [...prev.groupFields, { id: crypto.randomUUID(), field: "estado_gestion" }] });
  }

  function removeGroupField(id: string) {
    setPanelDraft((prev) => ({ ...prev, groupFields: prev.groupFields.filter((group) => group.id !== id) }));
  }

  function updateMetricAggregation(aggregation: MetricAggregation) {
    setPanelDraft((prev) => ({ ...prev, metric: aggregation === "count" ? { aggregation: "count" } : { aggregation, field: prev.metric.field || numericColumns[0]?.field || "monto_devolucion" } }));
  }

  return (
    <div className="zoho-module-page dashboard-page">
      <div className="zoho-module-header dashboard-hero-header">
        <div>
          <h1>Dashboard ejecutivo</h1>
          <p>Constructor de paneles tipo Zoho: módulos, medidas, agrupamientos múltiples y criterios de filtro.</p>
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

      <div className="zoho-scope-hint">Los filtros, columnas y paneles personalizados se guardan por mandante seleccionado. Registros base encontrados: <strong>{data.length}</strong>.</div>

      <div className="dashboard-advanced-layout dashboard-dashboard-layout-fixed">
        <ModuleFilterPanel
          title="Filtrar dashboard por cualquier campo"
          fields={recordFilterFields}
          onApply={(rules, search) => { setActiveRules(rules); setQuickSearch(search); }}
        />

        <div className="dashboard-main-workspace">
          <div className="dashboard-filter-help">
            <strong>Constructor de paneles:</strong> crea componentes como los de Zoho seleccionando el módulo, una medida, varios agrupamientos y filtros con patrón <strong>{"((1 y 2) y 3)"}</strong>.
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
                    <p>Crea tablas, gráficos circulares, barras o KPI con agrupamientos y filtros propios.</p>
                  </div>
                  <button className="zoho-btn zoho-btn-primary" onClick={openNewPanel}>Agregar componente</button>
                </div>
                {panels.length === 0 ? <div className="zoho-empty">No tienes paneles creados para esta vista.</div> : (
                  <div className="dashboard-custom-grid">
                    {panels.map((panel) => <CustomPanel key={panel.id} panel={panel} rows={data} onEdit={editPanel} onClone={clonePanel} onDelete={deletePanel} onOpenRecord={(id) => navigate(`/records/${id}`)} />)}
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
        </div>
      </div>

      <ZohoModal title={editingPanelId ? "Editar gráfico" : "Crear panel de información"} isOpen={panelModalOpen} onClose={() => setPanelModalOpen(false)}>
        <div className="dashboard-panel-editor dashboard-panel-editor-zoho">
          <div className="panel-editor-form">
            <label>Nombre del componente
              <input className="zoho-input" value={panelDraft.title} onChange={(e) => setPanelDraft((prev) => ({ ...prev, title: e.target.value }))} />
            </label>
            <label>Módulo(s)
              <select className="zoho-select" value={panelDraft.module} onChange={(e) => setPanelDraft((prev) => ({ ...prev, module: e.target.value }))}>
                {moduleOptions.map((option) => <option key={option} value={option}>{option}{moduleSupported(option) ? "" : " (referencial)"}</option>)}
              </select>
            </label>
            <label>Datos relacionados
              <select className="zoho-select" value={panelDraft.relatedModule} onChange={(e) => setPanelDraft((prev) => ({ ...prev, relatedModule: e.target.value }))}>
                {moduleOptions.map((option) => <option key={option} value={option}>{option}{moduleSupported(option) ? "" : " (referencial)"}</option>)}
              </select>
            </label>
            <label>Tipo de gráfico
              <select className="zoho-select" value={panelDraft.chartType} onChange={(e) => setPanelDraft((prev) => ({ ...prev, chartType: e.target.value as PanelChartType }))}>
                {chartTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="panel-editor-block">
              <strong>Medida (Eje Y)</strong>
              <div className="panel-editor-row">
                <select className="zoho-select short" value={panelDraft.metric.aggregation} onChange={(e) => updateMetricAggregation(e.target.value as MetricAggregation)}>
                  <option value="count">Cantidad de registros</option>
                  <option value="sum">Suma de</option>
                  <option value="avg">Promedio de</option>
                  <option value="min">Mínimo de</option>
                  <option value="max">Máximo de</option>
                </select>
                {panelDraft.metric.aggregation !== "count" && <select className="zoho-select" value={panelDraft.metric.field || numericColumns[0]?.field || "monto_devolucion"} onChange={(e) => setPanelDraft((prev) => ({ ...prev, metric: { ...prev.metric, field: e.target.value } }))}>
                  {numericColumns.map((column) => <option key={column.field} value={column.field}>{fieldLongLabel(column.field)}</option>)}
                </select>}
              </div>
            </div>

            {panelDraft.chartType !== "kpi" && <div className="panel-editor-block">
              <div className="panel-editor-title-row"><strong>Agrupamiento</strong><button className="zoho-btn small" onClick={addGroupField} disabled={panelDraft.groupFields.length >= 6}>Agregar agrupamiento</button></div>
              {panelDraft.groupFields.length === 0 && <div className="zoho-empty small">Sin agrupamiento: el panel mostrará un total.</div>}
              {panelDraft.groupFields.map((group, index) => {
                const isDate = dateColumns.some((column) => column.field === group.field);
                return (
                  <div className="panel-editor-row" key={group.id}>
                    <span className="panel-index-badge">{index + 1}</span>
                    <select className="zoho-select" value={group.field} onChange={(e) => updateGroupField(group.id, { field: e.target.value, datePart: dateColumns.some((column) => column.field === e.target.value) ? "year" : "none" })}>
                      <optgroup label="Fechas">
                        {dateColumns.map((column) => <option key={column.field} value={column.field}>{fieldLongLabel(column.field)}</option>)}
                      </optgroup>
                      <optgroup label="Dimensiones">
                        {dimensionColumns.map((column) => <option key={column.field} value={column.field}>{fieldLongLabel(column.field)}</option>)}
                      </optgroup>
                    </select>
                    {isDate && <select className="zoho-select short" value={group.datePart || "year"} onChange={(e) => updateGroupField(group.id, { datePart: e.target.value as DatePart })}>
                      <option value="year">Por año</option>
                      <option value="month">Por mes</option>
                      <option value="day">Por día</option>
                      <option value="none">Fecha completa</option>
                    </select>}
                    <button className="zoho-btn danger small" onClick={() => removeGroupField(group.id)}>Quitar</button>
                  </div>
                );
              })}
            </div>}

            <div className="panel-editor-block criteria-block">
              <div className="panel-editor-title-row">
                <strong>Criterios de filtro</strong>
                <div className="criteria-actions">
                  <select className="zoho-select short" value={panelDraft.criteriaMode} onChange={(e) => setPanelDraft((prev) => ({ ...prev, criteriaMode: e.target.value as "AND" | "OR" }))}>
                    <option value="AND">Y</option>
                    <option value="OR">O</option>
                  </select>
                  <button className="zoho-btn small" onClick={addPanelFilter}>Agregar filtro</button>
                </div>
              </div>
              {panelDraft.filters.length === 0 && <div className="zoho-empty small">Sin filtros propios para este panel.</div>}
              {panelDraft.filters.map((rule, index) => (
                <div className="panel-editor-row filter-criteria-row" key={rule.id}>
                  <span className="panel-index-badge">{index + 1}</span>
                  <select className="zoho-select" value={rule.field} onChange={(e) => updatePanelFilter(rule.id, { field: e.target.value })}>
                    {recordColumns.map((column) => <option key={column.field} value={column.field}>{column.label}</option>)}
                  </select>
                  <select className="zoho-select short" value={rule.operator} onChange={(e) => updatePanelFilter(rule.id, { operator: e.target.value as PanelOperator })}>
                    <option value="equals">es</option>
                    <option value="contains">contiene</option>
                    <option value="not_equals">no es</option>
                    <option value="empty">está vacío</option>
                    <option value="not_empty">no está vacío</option>
                    <option value="greater_than">mayor que</option>
                    <option value="less_than">menor que</option>
                  </select>
                  {!['empty', 'not_empty'].includes(rule.operator) && <input className="zoho-input" value={rule.value} onChange={(e) => updatePanelFilter(rule.id, { value: e.target.value })} placeholder="Valor o varios separados por coma" />}
                  <button className="zoho-btn danger small" onClick={() => removePanelFilter(rule.id)}>Eliminar</button>
                  {index < panelDraft.filters.length - 1 && <span className="criteria-connector">{panelDraft.criteriaMode === "AND" ? "Y" : "O"}</span>}
                </div>
              ))}
              <div className="criteria-pattern"><strong>Patrón de criterios:</strong> {filterPattern(panelDraft.filters, panelDraft.criteriaMode)} <button className="link-button" onClick={() => setPanelDraft((prev) => ({ ...prev, criteriaMode: prev.criteriaMode === "AND" ? "OR" : "AND" }))}>Editar patrón</button></div>
            </div>
          </div>
          <div className="panel-editor-preview">
            <div className="panel-preview-label">Vista previa</div>
            <CustomPanel panel={{ id: "preview", ...panelDraft }} rows={data} preview onEdit={() => undefined} onClone={() => undefined} onDelete={() => undefined} onOpenRecord={() => undefined} />
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

function CustomPanel({ panel, rows, preview, onEdit, onClone, onDelete, onOpenRecord }: { panel: PanelConfig; rows: RecordItem[]; preview?: boolean; onEdit: (panel: PanelConfig) => void; onClone: (panel: PanelConfig) => void; onDelete: (panelId: string) => void; onOpenRecord: (recordId: string) => void }) {
  const panelRows = buildPanelRows(rows, panel);
  const filtered = applyPanelFilters(rows, panel.filters, panel.criteriaMode);
  const max = Math.max(...panelRows.map((row) => Math.abs(row.value)), 1);
  const total = panelRows.reduce((sum, row) => sum + row.value, 0);
  const previewRows = panelRows.slice(0, panel.chartType === "pie" ? 8 : 40);
  const metricText = metricLabel(panel.metric);

  return (
    <div className={`zoho-card custom-dashboard-panel panel-${panel.chartType}`}>
      <div className="custom-panel-header">
        <div>
          <h3>{panel.title}</h3>
          <small>{metricText}{panel.groupFields.length ? ` por ${panel.groupFields.map((group) => fieldLabel(group.field)).join(" / ")}` : ""}</small>
        </div>
        {!preview && <div className="custom-panel-actions">
          <button className="zoho-btn small" onClick={() => onEdit(panel)}>Editar</button>
          <button className="zoho-btn small" onClick={() => onClone(panel)}>Clonar</button>
          <button className="zoho-btn danger small" onClick={() => onDelete(panel.id)}>Eliminar</button>
        </div>}
      </div>

      {filtered.length === 0 && <div className="zoho-empty small">Sin datos para los filtros configurados.</div>}

      {filtered.length > 0 && panel.chartType === "kpi" && <div className="custom-kpi-big"><strong>{formatMetric(total, panel.metric)}</strong><span>{filtered.length} registros considerados</span></div>}

      {filtered.length > 0 && panel.chartType === "bar" && <div className="custom-bar-chart">
        {previewRows.map((row) => <div className="custom-bar-row" key={row.key}>
          <div className="custom-bar-label"><strong>{row.labels.join(" / ")}</strong><span>{formatMetric(row.value, panel.metric)}</span></div>
          <div className="custom-bar-track"><div style={{ width: `${Math.max(4, (Math.abs(row.value) / max) * 100)}%` }} /></div>
        </div>)}
      </div>}

      {filtered.length > 0 && panel.chartType === "pie" && <PieLikeChart rows={previewRows} metric={panel.metric} total={total} />}

      {filtered.length > 0 && panel.chartType === "table" && <div className="zoho-table-scroll custom-panel-table-scroll">
        <table className="zoho-table compact custom-panel-table">
          <thead><tr>{panel.groupFields.map((group) => <th key={group.id}>{fieldLabel(group.field)}{group.datePart && group.datePart !== "none" ? ` - ${group.datePart === "year" ? "Por año" : group.datePart === "month" ? "Por mes" : "Por día"}` : ""}</th>)}<th>{metricText}</th><th>Cantidad</th></tr></thead>
          <tbody>{previewRows.map((row) => (
            <tr key={row.key}>
              {row.labels.map((label, index) => <td key={`${row.key}-${index}`}>{label}</td>)}
              <td>{formatMetric(row.value, panel.metric)}</td>
              <td>{row.count}</td>
            </tr>
          ))}
          {previewRows.length > 1 && <tr className="custom-panel-total-row"><td colSpan={Math.max(panel.groupFields.length, 1)}>Total</td><td>{formatMetric(total, panel.metric)}</td><td>{filtered.length}</td></tr>}
          </tbody>
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

function PieLikeChart({ rows, metric, total }: { rows: PanelRow[]; metric: PanelMetricConfig; total: number }) {
  const colors = ["#1f7ae0", "#ff6b3d", "#1fbf75", "#8b5cf6", "#f59e0b", "#06b6d4", "#ef4444", "#64748b"];
  let start = 0;
  const safeTotal = total || rows.reduce((sum, row) => sum + Math.abs(row.value), 0) || 1;
  const gradient = rows.map((row, index) => {
    const pct = (Math.abs(row.value) / safeTotal) * 100;
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
