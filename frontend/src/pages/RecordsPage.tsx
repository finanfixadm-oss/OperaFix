import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";
import type { FilterRule, ManagementLineAfp } from "../types";
import type { RecordItem } from "../types-records";
import { defaultRecordColumnFields, formatCellValue, formatMoney, getValueByPath, recordColumns, recordFilterFields } from "../utils-record-fields";
import RecordDetailPanel from "../components/records/RecordDetailPanel";
import RecordPriorityBadge from "../components/records/RecordPriorityBadge";
import RecordQuickFilters, { type RecordQuickFilterKey } from "../components/records/RecordQuickFilters";
import RecordStatusBadge from "../components/records/RecordStatusBadge";
import RecordsKanbanView from "../components/records/RecordsKanbanView";
import RecordsAfpSummary, { type RecordsAfpSummaryGroup } from "../components/records/RecordsAfpSummary";

type MandanteOption = {
  id: string;
  name: string;
};

type FormState = {
  mandante_id: string;
  line_afp_id: string;
  management_type: string;
  owner_name: string;
  razon_social: string;
  rut: string;
  direccion: string;
  entidad: string;
  estado_gestion: string;
  numero_solicitud: string;
  envio_afp: string;
  estado_contrato_cliente: string;
  fecha_termino_contrato: string;
  estado_trabajador: string;
  motivo_tipo_exceso: string;
  motivo_rechazo: string;
  fecha_rechazo: string;
  mes_produccion_2026: string;
  mes_ingreso_solicitud: string;
  grupo_empresa: string;
  acceso_portal: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  confirmacion_cc: string;
  confirmacion_poder: string;
  consulta_cen: string;
  contenido_cen: string;
  respuesta_cen: string;
  fecha_presentacion_afp: string;
  fecha_ingreso_afp: string;
  fecha_pago_afp: string;
  monto_devolucion: string;
  monto_pagado: string;
  monto_cliente: string;
  monto_finanfix_solutions: string;
  monto_real_cliente: string;
  monto_real_finanfix_solutions: string;
  fee: string;
  facturado_finanfix: string;
  facturado_cliente: string;
  fecha_factura_finanfix: string;
  fecha_pago_factura_finanfix: string;
  fecha_notificacion_cliente: string;
  numero_factura: string;
  numero_oc: string;
  comment: string;
};

const emptyForm: FormState = {
  mandante_id: "",
  line_afp_id: "",
  management_type: "LM",
  owner_name: "",
  razon_social: "",
  rut: "",
  direccion: "",
  entidad: "",
  estado_gestion: "Pendiente Gestión",
  numero_solicitud: "",
  envio_afp: "Pendiente",
  estado_contrato_cliente: "",
  fecha_termino_contrato: "",
  estado_trabajador: "",
  motivo_tipo_exceso: "",
  motivo_rechazo: "",
  fecha_rechazo: "",
  mes_produccion_2026: "",
  mes_ingreso_solicitud: "",
  grupo_empresa: "",
  acceso_portal: "",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
  confirmacion_cc: "false",
  confirmacion_poder: "false",
  consulta_cen: "",
  contenido_cen: "",
  respuesta_cen: "",
  fecha_presentacion_afp: "",
  fecha_ingreso_afp: "",
  fecha_pago_afp: "",
  monto_devolucion: "",
  monto_pagado: "",
  monto_cliente: "",
  monto_finanfix_solutions: "",
  monto_real_cliente: "",
  monto_real_finanfix_solutions: "",
  fee: "",
  facturado_finanfix: "",
  facturado_cliente: "",
  fecha_factura_finanfix: "",
  fecha_pago_factura_finanfix: "",
  fecha_notificacion_cliente: "",
  numero_factura: "",
  numero_oc: "",
  comment: "",
};

function matchRule(value: unknown, rule: FilterRule) {
  const normalized = String(value ?? "").toLowerCase();
  const query = String(rule.value ?? "").toLowerCase();

  switch (rule.operator) {
    case "equals":
      return normalized === query;
    case "not_equals":
      return normalized !== query;
    case "contains":
      return normalized.includes(query);
    case "not_contains":
      return !normalized.includes(query);
    case "starts_with":
      return normalized.startsWith(query);
    case "ends_with":
      return normalized.endsWith(query);
    case "includes_all":
      return query.split(",").map((x) => x.trim()).filter(Boolean).every((part) => normalized.includes(part));
    case "includes_any":
      return query.split(",").map((x) => x.trim()).filter(Boolean).some((part) => normalized.includes(part));
    default:
      return true;
  }
}

function normalizeMandanteText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function rowMatchesMandante(row: RecordItem, mandante: MandanteOption) {
  const rowAny: any = row;
  const rowMandante: any = row.mandante || {};
  const possibleIds = [rowMandante.id, rowAny.mandante_id, rowAny.mandanteId].filter(Boolean).map(String);
  if (possibleIds.includes(String(mandante.id))) return true;

  const targetName = normalizeMandanteText(mandante.name);
  const possibleNames = [rowMandante.name, rowAny.mandante_name, rowAny.mandante].map((value) => normalizeMandanteText(value));
  return possibleNames.includes(targetName);
}

type SortDirection = "asc" | "desc";

type RecordsSortState = {
  field: string;
  direction: SortDirection;
};

type RecordsScopedSettings = {
  activeRules: FilterRule[];
  quickSearch: string;
  visibleColumns: string[];
  columnOrder: string[];
  sort: RecordsSortState;
};

function recordsScopedKey(view: string) {
  return `operafix_records_scoped_settings_v27_${view || "todos"}`;
}

function cleanRecordColumns(fields: unknown) {
  if (!Array.isArray(fields)) return defaultRecordColumnFields;
  const clean = fields.filter((field) => typeof field === "string" && recordColumns.some((column) => column.field === field));
  return clean.length ? clean : defaultRecordColumnFields;
}

function defaultRecordSort(): RecordsSortState {
  return { field: "updated_at", direction: "desc" };
}

function cleanRecordSort(sort: unknown): RecordsSortState {
  const parsed = sort as Partial<RecordsSortState> | null | undefined;
  const field = typeof parsed?.field === "string" && recordColumns.some((column) => column.field === parsed.field)
    ? parsed.field
    : defaultRecordSort().field;
  const direction: SortDirection = parsed?.direction === "asc" ? "asc" : "desc";
  return { field, direction };
}

function getRecordFieldValue(row: RecordItem, field: string) {
  const column = recordColumns.find((item) => item.field === field);
  if (column) return column.value(row);
  return getValueByPath(row, field);
}

function compareRecordValues(a: unknown, b: unknown, field: string) {
  const column = recordColumns.find((item) => item.field === field);
  if (column?.type === "number") return Number(a || 0) - Number(b || 0);
  if (column?.type === "date") {
    const at = a ? new Date(String(a)).getTime() : 0;
    const bt = b ? new Date(String(b)).getTime() : 0;
    return (Number.isFinite(at) ? at : 0) - (Number.isFinite(bt) ? bt : 0);
  }
  if (typeof a === "boolean" || typeof b === "boolean") return Number(Boolean(a)) - Number(Boolean(b));
  return String(a ?? "").localeCompare(String(b ?? ""), "es", { numeric: true, sensitivity: "base" });
}

function cleanRecordColumnOrder(fields: unknown) {
  const allFields = recordColumns.map((column) => column.field);
  if (!Array.isArray(fields)) return allFields;
  const clean = fields.filter((field) => typeof field === "string" && allFields.includes(field));
  const missing = allFields.filter((field) => !clean.includes(field));
  return [...clean, ...missing];
}

function readRecordsScopedSettings(view: string): RecordsScopedSettings {
  try {
    const saved = localStorage.getItem(recordsScopedKey(view));
    if (!saved) return { activeRules: [], quickSearch: "", visibleColumns: defaultRecordColumnFields, columnOrder: cleanRecordColumnOrder(null), sort: defaultRecordSort() };
    const parsed = JSON.parse(saved);
    return {
      activeRules: Array.isArray(parsed?.activeRules) ? parsed.activeRules : [],
      quickSearch: typeof parsed?.quickSearch === "string" ? parsed.quickSearch : "",
      visibleColumns: cleanRecordColumns(parsed?.visibleColumns),
      columnOrder: cleanRecordColumnOrder(parsed?.columnOrder),
      sort: cleanRecordSort(parsed?.sort),
    };
  } catch {
    return { activeRules: [], quickSearch: "", visibleColumns: defaultRecordColumnFields, columnOrder: cleanRecordColumnOrder(null), sort: defaultRecordSort() };
  }
}

function saveRecordsScopedSettings(view: string, settings: RecordsScopedSettings) {
  localStorage.setItem(recordsScopedKey(view), JSON.stringify({
    activeRules: settings.activeRules || [],
    quickSearch: settings.quickSearch || "",
    visibleColumns: cleanRecordColumns(settings.visibleColumns),
    columnOrder: cleanRecordColumnOrder(settings.columnOrder),
    sort: cleanRecordSort(settings.sort),
  }));
}


type RecordsViewMode = "table" | "kanban";

function recordMoneyValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const n = Number(
    String(value ?? 0)
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, "")
  );

  return Number.isFinite(n) ? n : 0;
}

function recordDaysSince(value?: string | null) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function recordText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function recordBool(value: unknown) {
  if (typeof value === "boolean") return value;

  const text = recordText(value);
  return text === "true" || text === "si" || text === "sí" || text === "1" || text === "confirmado" || text === "confirmada";
}

function isPendingManagement(row: RecordItem) {
  const rowAny: any = row;
  const status = recordText(rowAny.estado_gestion ?? rowAny.management_status);
  return status.includes("pendiente") || status.includes("pend");
}

function isReadyToManage(row: RecordItem) {
  const rowAny: any = row;
  const hasCc = recordBool(rowAny.confirmacion_cc ?? rowAny.confirmation_cc);
  const hasPower = recordBool(rowAny.confirmacion_poder ?? rowAny.confirmation_power);
  const amount = recordMoneyValue(rowAny.monto_devolucion ?? rowAny.refund_amount);

  return hasCc && hasPower && amount > 0 && isPendingManagement(row);
}

function rowMatchesQuickFilter(row: RecordItem, filter: RecordQuickFilterKey) {
  const rowAny: any = row;
  const status = recordText(rowAny.estado_gestion ?? rowAny.management_status);
  const amount = recordMoneyValue(rowAny.monto_devolucion ?? rowAny.refund_amount);
  const hasCc = recordBool(rowAny.confirmacion_cc ?? rowAny.confirmation_cc);
  const hasPower = recordBool(rowAny.confirmacion_poder ?? rowAny.confirmation_power);
  const lastActivityDays = recordDaysSince(row.last_activity_at || row.updated_at || row.created_at);

  switch (filter) {
    case "listos":
      return isReadyToManage(row);
    case "sin_poder":
      return !hasPower;
    case "sin_cc":
      return !hasCc;
    case "alto_monto":
      return amount >= 1000000;
    case "pendientes":
      return status.includes("pendiente") || status.includes("pend");
    case "pagados":
      return status.includes("pag") || status.includes("cerr") || status.includes("factur");
    case "rechazados":
      return status.includes("rechaz") || recordText(row.motivo_rechazo).includes("rechaz");
    case "dormidos":
      return lastActivityDays > 30;
    case "todos":
    default:
      return true;
  }
}

function buildRecordsSummary(rows: RecordItem[]) {
  return rows.reduce(
    (acc, row) => {
      const rowAny: any = row;
      const amount = recordMoneyValue(rowAny.monto_devolucion ?? rowAny.refund_amount);
      const status = recordText(rowAny.estado_gestion ?? rowAny.management_status);
      const hasCc = recordBool(rowAny.confirmacion_cc ?? rowAny.confirmation_cc);
      const hasPower = recordBool(rowAny.confirmacion_poder ?? rowAny.confirmation_power);

      acc.total += 1;
      acc.amount += amount;
      if (isReadyToManage(row)) acc.ready += 1;
      if (!hasCc) acc.blockedCc += 1;
      if (!hasPower) acc.blockedPower += 1;
      if (amount >= 1000000) acc.highAmount += 1;
      if (status.includes("pag") || status.includes("cerr") || status.includes("factur")) acc.paid += 1;
      return acc;
    },
    { total: 0, amount: 0, ready: 0, blockedCc: 0, blockedPower: 0, highAmount: 0, paid: 0 }
  );
}

function getRecordEntity(row: RecordItem) {
  const rowAny: any = row;
  return String(rowAny.entidad ?? rowAny.entity ?? row.lineAfp?.afp_name ?? "Sin AFP").trim() || "Sin AFP";
}

function buildAfpSummary(rows: RecordItem[]): RecordsAfpSummaryGroup[] {
  const map = new Map<string, RecordsAfpSummaryGroup>();

  rows.forEach((row) => {
    const entity = getRecordEntity(row);
    const key = recordText(entity);
    const rowAny: any = row;
    const amount = recordMoneyValue(rowAny.monto_devolucion ?? rowAny.refund_amount);
    const status = recordText(rowAny.estado_gestion ?? rowAny.management_status);
    const hasCc = recordBool(rowAny.confirmacion_cc ?? rowAny.confirmation_cc);
    const hasPower = recordBool(rowAny.confirmacion_poder ?? rowAny.confirmation_power);

    const current = map.get(key) || {
      entity,
      amount: 0,
      count: 0,
      ready: 0,
      pending: 0,
      paid: 0,
      blockedPower: 0,
      blockedCc: 0,
    };

    current.amount += amount;
    current.count += 1;
    if (isReadyToManage(row)) current.ready += 1;
    if (status.includes("pendiente") || status.includes("pend")) current.pending += 1;
    if (status.includes("pag") || status.includes("cerr") || status.includes("factur")) current.paid += 1;
    if (!hasPower) current.blockedPower += 1;
    if (!hasCc) current.blockedCc += 1;

    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.count - a.count || a.entity.localeCompare(b.entity));
}


export default function RecordsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<RecordItem[]>([]);
  const [mandantes, setMandantes] = useState<MandanteOption[]>([]);
  const [allAfps, setAllAfps] = useState<ManagementLineAfp[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [activeView, setActiveView] = useState("todos");
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const initialRecordsSettings = readRecordsScopedSettings("todos");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => initialRecordsSettings.visibleColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => initialRecordsSettings.columnOrder);
  const [sort, setSort] = useState<RecordsSortState>(() => initialRecordsSettings.sort);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickFilter, setQuickFilter] = useState<RecordQuickFilterKey>("todos");
  const [selectedAfpFilter, setSelectedAfpFilter] = useState("");
  const [viewMode, setViewMode] = useState<RecordsViewMode>("table");
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const selectedRecordId = searchParams.get("id") || searchParams.get("recordId");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadRows() {
    setLoading(true);
    try {
      const data = await fetchJson<RecordItem[]>("/records");
      setRows(data);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar los registros de empresas.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMandantes() {
    try {
      const data = await fetchJson<MandanteOption[]>("/mandantes");
      setMandantes(data);
    } catch (error) {
      console.error(error);
      setMandantes([]);
    }
  }

  async function loadAfps() {
    try {
      const data = await fetchJson<ManagementLineAfp[]>("/management-line-afps");
      setAllAfps(data);
    } catch (error) {
      console.error(error);
      setAllAfps([]);
    }
  }

  useEffect(() => {
    loadRows();
    loadMandantes();
    loadAfps();
  }, []);

  useEffect(() => {
    if (!selectedRecordId || !rows.length) return;
    const found = rows.find((row) => String(row.id) === String(selectedRecordId));
    if (found) setSelectedRecord(found);
  }, [selectedRecordId, rows]);

  useEffect(() => {
    saveRecordsScopedSettings(activeView, { activeRules, quickSearch, visibleColumns, columnOrder, sort });
  }, [activeView, activeRules, quickSearch, visibleColumns, columnOrder, sort]);

  function switchActiveView(nextView: string) {
    saveRecordsScopedSettings(activeView, { activeRules, quickSearch, visibleColumns, columnOrder, sort });
    const nextSettings = readRecordsScopedSettings(nextView);
    setActiveRules(nextSettings.activeRules);
    setQuickSearch(nextSettings.quickSearch);
    setVisibleColumns(nextSettings.visibleColumns);
    setColumnOrder(nextSettings.columnOrder);
    setSort(nextSettings.sort);
    setActiveView(nextView);
  }

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const selectedAfp = useMemo(() => allAfps.find((item) => item.id === form.line_afp_id) || null, [allAfps, form.line_afp_id]);

  function openRecordPanel(row: RecordItem) {
    setSelectedRecord(row);
  }

  function openRecordFull(row: RecordItem) {
    window.open(`/records/${row.id}`, "_blank");
  }

  async function deleteRecord(row: RecordItem) {
    const razon = String((row as any).razon_social || (row as any).company?.razon_social || "registro");
    const rut = String((row as any).rut || (row as any).company?.rut || "");
    if (!confirm(`¿Eliminar la gestión de ${razon}${rut ? ` (${rut})` : ""}?\n\nEsta acción eliminará el registro y su trazabilidad/documentos asociados.`)) return;
    try {
      await fetchJson(`/records/${row.id}`, { method: "DELETE" });
      await loadRows();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "No se pudo eliminar la gestión.");
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function toggleAllVisible(checked: boolean) {
    const visibleIds = pagedRows.map((row) => String(row.id));
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, ...visibleIds])) : prev.filter((id) => !visibleIds.includes(id)));
  }

  async function deleteSelectedRecords() {
    if (!selectedIds.length) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} gestiones seleccionadas?\n\nEsta acción elimina registros, trazabilidad y documentos asociados.`)) return;
    try {
      await fetchJson("/records/bulk/delete", { method: "DELETE", body: JSON.stringify({ ids: selectedIds }) });
      setSelectedIds([]);
      await loadRows();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "No se pudo ejecutar la eliminación masiva.");
    }
  }

  async function createRecord() {
    if (!form.mandante_id.trim()) {
      alert("Debes seleccionar el mandante.");
      return;
    }

    if (!form.razon_social.trim()) {
      alert("Debes ingresar Razón Social.");
      return;
    }

    if (!form.rut.trim()) {
      alert("Debes ingresar RUT.");
      return;
    }

    const selectedMandante = mandantes.find((item) => item.id === form.mandante_id);
    const line = selectedAfp?.line;
    const { line_afp_id: _ignoredLineAfpId, ...formPayload } = form;

    setSaving(true);
    try {
      await postJson<RecordItem>("/records", {
        ...(line?.group?.id ? { group_id: line.group.id } : {}),
        ...(line?.company?.id ? { company_id: line.company.id } : {}),
        ...(line?.id ? { line_id: line.id } : {}),
        ...(selectedAfp?.id ? { line_afp_id: selectedAfp.id } : {}),
        ...formPayload,
        mandante_id: form.mandante_id,
        mandante_name: selectedMandante?.name,
        confirmacion_cc: form.confirmacion_cc === "true",
        confirmacion_poder: form.confirmacion_poder === "true",
      });

      setModalOpen(false);
      setForm(emptyForm);
      await loadRows();
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el registro de empresa.");
    } finally {
      setSaving(false);
    }
  }

  const fields = recordFilterFields;
  const selectedColumns = useMemo(() => {
    return columnOrder
      .filter((field) => visibleColumns.includes(field))
      .map((field) => recordColumns.find((column) => column.field === field))
      .filter(Boolean) as typeof recordColumns;
  }, [visibleColumns, columnOrder]);

  function toggleColumn(field: string) {
    setVisibleColumns((prev) => prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]);
  }

  const orderedRecordColumns = useMemo(() => {
    return columnOrder
      .map((field) => recordColumns.find((column) => column.field === field))
      .filter(Boolean) as typeof recordColumns;
  }, [columnOrder]);

  function reorderColumn(activeField: string, overField: string) {
    if (!activeField || !overField || activeField === overField) return;
    setColumnOrder((prev) => {
      const current = cleanRecordColumnOrder(prev);
      const fromIndex = current.indexOf(activeField);
      const toIndex = current.indexOf(overField);
      if (fromIndex === -1 || toIndex === -1) return current;
      const next = [...current];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }

  function handleColumnDragStart(field: string) {
    setDraggedColumn(field);
  }

  function handleColumnDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleColumnDrop(targetField: string) {
    if (draggedColumn) reorderColumn(draggedColumn, targetField);
    setDraggedColumn(null);
  }

  function resetColumns() {
    setVisibleColumns(defaultRecordColumnFields);
    setColumnOrder(cleanRecordColumnOrder(null));
  }

  function selectAllColumns() {
    setVisibleColumns(recordColumns.map((column) => column.field));
    setColumnOrder(cleanRecordColumnOrder(columnOrder));
  }

  const baseFilteredRows = useMemo(() => {
    let data = [...rows];

    if (activeView !== "todos" && activeView !== "mis") {
      const selectedMandante = mandantes.find((mandante) => mandante.id === activeView);
      if (selectedMandante) {
        data = data.filter((row) => rowMatchesMandante(row, selectedMandante));
      }
    }

    if (activeView === "mis") {
      data = data.filter((row) => Boolean(row.owner_name));
    }

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        recordColumns
          .map((column) => column.value(row))
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeRules.length) {
      data = data.filter((row) => activeRules.every((rule) => matchRule(getRecordFieldValue(row, rule.field), rule)));
    }

    if (quickFilter !== "todos") {
      data = data.filter((row) => rowMatchesQuickFilter(row, quickFilter));
    }

    return data;
  }, [rows, activeRules, quickSearch, activeView, mandantes, quickFilter]);

  const afpSummaryRows = useMemo(() => buildAfpSummary(baseFilteredRows), [baseFilteredRows]);

  const filteredRows = useMemo(() => {
    if (!selectedAfpFilter) return baseFilteredRows;
    const selected = recordText(selectedAfpFilter);
    return baseFilteredRows.filter((row) => recordText(getRecordEntity(row)) === selected);
  }, [baseFilteredRows, selectedAfpFilter]);

  const sortedRows = useMemo(() => {
    const selectedSort = cleanRecordSort(sort);
    const directionMultiplier = selectedSort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const result = compareRecordValues(
        getRecordFieldValue(a, selectedSort.field),
        getRecordFieldValue(b, selectedSort.field),
        selectedSort.field
      );
      return result * directionMultiplier;
    });
  }, [filteredRows, sort]);

  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeRules, quickSearch, activeView, sort, quickFilter, selectedAfpFilter]);

  const visibleSortedIds = useMemo(() => pagedRows.map((row) => String(row.id)), [pagedRows]);
  const allVisibleSelected = visibleSortedIds.length > 0 && visibleSortedIds.every((id) => selectedIds.includes(id));

  const currentSortLabel = recordColumns.find((column) => column.field === sort.field)?.label || "Fecha actualización";
  const recordsSummary = useMemo(() => buildRecordsSummary(sortedRows), [sortedRows]);

  function clearAdvancedFilters() {
    setActiveRules([]);
    setQuickSearch("");
  }

  function applyStandardSort() {
    setSort(defaultRecordSort());
    setSortModalOpen(false);
  }

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Registros de empresas</h1>
          <p>Lista de líneas/casos de gestión por empresa, AFP y mandante</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn" onClick={() => setFilterModalOpen(true)}>Filtrar</button>
          <button className="zoho-btn" onClick={() => setSortModalOpen(true)}>Ordenar</button>
          <button className="zoho-btn" onClick={() => setColumnModalOpen(true)}>Campos / columnas</button>
          <button className={viewMode === "table" ? "zoho-btn active" : "zoho-btn"} onClick={() => setViewMode("table")}>Tabla</button>
          <button className={viewMode === "kanban" ? "zoho-btn active" : "zoho-btn"} onClick={() => setViewMode("kanban")}>Kanban</button>
          {selectedIds.length > 0 && <button className="zoho-btn danger" onClick={deleteSelectedRecords}>Eliminar seleccionados ({selectedIds.length})</button>}
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>
            Crear Registro de empresa
          </button>
        </div>
      </div>

      <div className="zoho-view-tabs">
        {mandantes.map((mandante) => (
          <button
            key={mandante.id}
            className={activeView === mandante.id ? "active" : ""}
            onClick={() => switchActiveView(mandante.id)}
          >
            {mandante.name}
          </button>
        ))}
        <button className={activeView === "mis" ? "active" : ""} onClick={() => switchActiveView("mis")}>Mis Registros</button>
        <button className={activeView === "todos" ? "active" : ""} onClick={() => switchActiveView("todos")}>Todos los registros</button>
      </div>

      <div className="zoho-scope-hint">Los filtros, columnas visibles y orden de columnas quedan guardados solo para la vista seleccionada.</div>

      <section className="records-pro-command-center">
        <div className="records-pro-kpis">
          <div><span>Registros filtrados</span><strong>{recordsSummary.total}</strong></div>
          <div><span>Monto devolución</span><strong>{formatMoney(recordsSummary.amount)}</strong></div>
          <div><span>Listos para gestionar</span><strong>{recordsSummary.ready}</strong></div>
          <div><span>Sin poder</span><strong>{recordsSummary.blockedPower}</strong></div>
          <div><span>Sin CC</span><strong>{recordsSummary.blockedCc}</strong></div>
          <div><span>Alto monto</span><strong>{recordsSummary.highAmount}</strong></div>
        </div>
        <div className="records-pro-ai-hint">
          <strong>OperaFix IA</strong>
          <span>{recordsSummary.ready > 0 ? `Hay ${recordsSummary.ready} casos listos para gestionar: tienen poder confirmado, cuenta corriente confirmada, monto devolución mayor a cero y estado pendiente de gestión.` : "No hay casos listos en este filtro. Para estar listo debe tener poder confirmado, CC confirmada, monto devolución mayor a cero y estado pendiente de gestión."}</span>
        </div>
        <RecordQuickFilters value={quickFilter} onChange={setQuickFilter} />

        <RecordsAfpSummary
          groups={afpSummaryRows}
          selectedAfp={selectedAfpFilter}
          onSelect={(entity) => setSelectedAfpFilter((current) => current === entity ? "" : entity)}
          onClear={() => setSelectedAfpFilter("")}
        />
      </section>

      <div className="zoho-module-layout records-pro-layout">
        <aside className="zoho-filter-compact-card">
          <strong>Filtros</strong>
          <span>{activeRules.length} criterios · {quickSearch ? `Búsqueda: ${quickSearch}` : "Sin búsqueda"}</span>
          <button className="zoho-btn" onClick={() => setFilterModalOpen(true)}>Abrir filtros</button>
          {(activeRules.length > 0 || quickSearch) && <button className="zoho-btn subtle" onClick={clearAdvancedFilters}>Limpiar</button>}
        </aside>

        <section className="zoho-table-wrap zoho-table-wrap-scroll">
          <div className="zoho-table-toolbar">
            <span>Registros totales {sortedRows.length} · Seleccionados {selectedIds.length}</span>
            <span className="zoho-table-range">Orden: {currentSortLabel} · {sort.direction === "asc" ? "Asc" : "Desc"} · Página {safeCurrentPage}/{totalPages} · Mostrando {pagedRows.length} de {sortedRows.length}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando registros...</div>
          ) : viewMode === "kanban" ? (
            <RecordsKanbanView rows={sortedRows} onOpen={openRecordPanel} />
          ) : (
            <>
            <div className="zoho-table-horizontal-scroll records-pro-table-scroll">
            <table className="zoho-table zoho-table-wide records-pro-table">
              <thead>
                <tr>
                  <th className="records-sticky-check"><input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleAllVisible(e.target.checked)} /></th>
                  <th>Prioridad</th>
                  {selectedColumns.map((column) => <th key={column.field}>{column.label}</th>)}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr><td colSpan={selectedColumns.length + 3}>Sin registros de empresas.</td></tr>
                ) : (
                  <>
                  {pagedRows.map((row) => (
                    <tr key={row.id} className="records-pro-row" onClick={() => openRecordPanel(row)}>
                      <td onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(String(row.id))} onChange={() => toggleSelected(String(row.id))} /></td>
                      <td><RecordPriorityBadge row={row} /></td>
                      {selectedColumns.map((column) => {
                        const value = column.value(row);
                        const isStatus = column.field === "estado_gestion";
                        const isMoney = column.money;
                        return (
                          <td key={`${row.id}-${column.field}`} className={isMoney ? "records-money-cell" : ""}>
                            {isStatus ? <RecordStatusBadge status={String(value || "")} /> : formatCellValue(value, column)}
                          </td>
                        );
                      })}
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="zoho-actions-row compact-actions">
                          <button className="zoho-small-btn" onClick={() => openRecordPanel(row)}>Detalle</button>
                          <button className="zoho-small-btn" onClick={() => openRecordFull(row)}>Abrir</button>
                          <button className="zoho-small-btn danger" onClick={() => deleteRecord(row)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </>
                )}
              </tbody>
            </table>
            </div>
            {sortedRows.length > pageSize && (
              <div className="zoho-pagination-bar">
                <button className="zoho-btn" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Anterior</button>
                <span>Registros {(safeCurrentPage - 1) * pageSize + 1} a {Math.min(safeCurrentPage * pageSize, sortedRows.length)} de {sortedRows.length}</span>
                <button className="zoho-btn" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Siguiente</button>
              </div>
            )}
            </>
          )}
        </section>
      </div>

      <RecordDetailPanel
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onOpenFull={openRecordFull}
      />

      <ZohoModal title="Filtrar registros" isOpen={filterModalOpen} onClose={() => setFilterModalOpen(false)}>
        <div className="modal-helper-text">
          Aplica filtros solo para la vista actual: <strong>{activeView === "todos" ? "Todos los registros" : activeView === "mis" ? "Mis Registros" : mandantes.find((m) => m.id === activeView)?.name || "Mandante"}</strong>.
        </div>
        <ModuleFilterPanel
          title="Filtros avanzados"
          fields={fields}
          initialRules={activeRules}
          initialQuickSearch={quickSearch}
          onApply={(rules, search) => {
            setActiveRules(rules);
            setQuickSearch(search);
            setFilterModalOpen(false);
          }}
        />
        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={clearAdvancedFilters}>Limpiar filtros</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setFilterModalOpen(false)}>Cerrar</button>
        </div>
      </ZohoModal>

      <ZohoModal title="Ordenar registros" isOpen={sortModalOpen} onClose={() => setSortModalOpen(false)}>
        <div className="sort-panel-grid">
          <Field label="Campo para ordenar">
            <select className="zoho-select" value={sort.field} onChange={(e) => setSort((prev) => ({ ...prev, field: e.target.value }))}>
              {recordColumns.map((column) => <option key={column.field} value={column.field}>{column.label}</option>)}
            </select>
          </Field>
          <Field label="Dirección">
            <select className="zoho-select" value={sort.direction} onChange={(e) => setSort((prev) => ({ ...prev, direction: e.target.value as SortDirection }))}>
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </Field>
        </div>
        <div className="sort-preview-box">
          Orden actual: <strong>{currentSortLabel}</strong> · <strong>{sort.direction === "asc" ? "Ascendente" : "Descendente"}</strong>
        </div>
        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={applyStandardSort}>Orden estándar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setSortModalOpen(false)}>Aplicar</button>
        </div>
      </ZohoModal>

      <ZohoModal title="Campos visibles en Registros de empresas" isOpen={columnModalOpen} onClose={() => setColumnModalOpen(false)}>
        <div className="column-picker-actions">
          <button className="zoho-btn" onClick={selectAllColumns}>Mostrar todos</button>
          <button className="zoho-btn" onClick={resetColumns}>Vista estándar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setColumnModalOpen(false)}>Aplicar</button>
        </div>
        <div className="column-order-help">
          Marca los campos que quieres ver y arrastra cada cuadro para definir el orden en la tabla.
        </div>
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
                <label>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumn(column.field)}
                  />
                  <span>{column.label}</span>
                </label>
                <div className="column-order-controls">
                  <span className="column-position">{isVisible ? visiblePosition + 1 : "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ZohoModal>
      <ZohoModal title="Crear Registro de empresa" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <FormSection title="0. Asociación">
          <Field label="Mandante">
            <select className="zoho-select" value={form.mandante_id} onChange={(e) => updateForm("mandante_id", e.target.value)}>
              <option value="">Seleccionar mandante</option>
              {mandantes.map((mandante) => (
                <option key={mandante.id} value={mandante.id}>{mandante.name}</option>
              ))}
            </select>
          </Field>

          <Field label="AFP / Línea asociada (opcional)">
            <select className="zoho-select" value={form.line_afp_id} onChange={(e) => updateForm("line_afp_id", e.target.value)}>
              <option value="">Crear automáticamente según Razón Social / RUT / Entidad</option>
              {allAfps.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.afp_name} · {item.line?.company?.razon_social || "Sin empresa"} · {item.line?.mandante?.name || "Sin mandante"}
                </option>
              ))}
            </select>
          </Field>
        </FormSection>

        <FormSection title="1. Ingreso de caso">
          <Field label="Tipo"><select className="zoho-select" value={form.management_type} onChange={(e) => updateForm("management_type", e.target.value)}><option value="LM">LM</option><option value="TP">TP</option></select></Field>
          <Field label="Mes de producción"><input className="zoho-input" value={form.mes_produccion_2026} onChange={(e) => updateForm("mes_produccion_2026", e.target.value)} /></Field>
          <Field label="Mes de ingreso solicitud"><input className="zoho-input" value={form.mes_ingreso_solicitud} onChange={(e) => updateForm("mes_ingreso_solicitud", e.target.value)} /></Field>
          <Field label="Acceso portal"><SelectYesNo value={form.acceso_portal} onChange={(v) => updateForm("acceso_portal", v)} /></Field>
          <Field label="Envío AFP"><SelectStatus value={form.envio_afp} onChange={(v) => updateForm("envio_afp", v)} options={["Pendiente", "Enviado", "Respondido", "Rechazado"]} /></Field>
          <Field label="Estado contrato con cliente"><SelectStatus value={form.estado_contrato_cliente} onChange={(v) => updateForm("estado_contrato_cliente", v)} options={["Vigente", "No vigente", "Pendiente"]} /></Field>
          <Field label="Estado Gestión"><SelectStatus value={form.estado_gestion} onChange={(v) => updateForm("estado_gestion", v)} options={["Pendiente Gestión", "En preparación", "Enviada AFP", "Respondida AFP", "Pagada", "Facturada", "Cerrada", "Rechazada"]} /></Field>
          <Field label="N° Solicitud"><input className="zoho-input" value={form.numero_solicitud} onChange={(e) => updateForm("numero_solicitud", e.target.value)} /></Field>
          <Field label="Motivo del rechazo/anulación"><input className="zoho-input" value={form.motivo_rechazo} onChange={(e) => updateForm("motivo_rechazo", e.target.value)} /></Field>
          <Field label="Fecha rechazo"><input className="zoho-input" type="date" value={form.fecha_rechazo} onChange={(e) => updateForm("fecha_rechazo", e.target.value)} /></Field>
          <Field label="Buscar Grupo"><input className="zoho-input" value={form.grupo_empresa} onChange={(e) => updateForm("grupo_empresa", e.target.value)} /></Field>
          <Field label="Propietario"><input className="zoho-input" value={form.owner_name} onChange={(e) => updateForm("owner_name", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="2. Datos empresa y bancarios">
          <Field label="Razón Social"><input className="zoho-input" value={form.razon_social} onChange={(e) => updateForm("razon_social", e.target.value)} /></Field>
          <Field label="RUT"><input className="zoho-input" value={form.rut} onChange={(e) => updateForm("rut", e.target.value)} /></Field>
          <Field label="Dirección"><input className="zoho-input" value={form.direccion} onChange={(e) => updateForm("direccion", e.target.value)} /></Field>
          <Field label="Entidad (AFP)"><input className="zoho-input" value={form.entidad} onChange={(e) => updateForm("entidad", e.target.value)} /></Field>
          <Field label="Banco"><input className="zoho-input" value={form.banco} onChange={(e) => updateForm("banco", e.target.value)} /></Field>
          <Field label="Tipo de Cuenta"><input className="zoho-input" value={form.tipo_cuenta} onChange={(e) => updateForm("tipo_cuenta", e.target.value)} /></Field>
          <Field label="Número cuenta"><input className="zoho-input" value={form.numero_cuenta} onChange={(e) => updateForm("numero_cuenta", e.target.value)} /></Field>
          <Field label="Confirmación CC"><SelectBool value={form.confirmacion_cc} onChange={(v) => updateForm("confirmacion_cc", v)} /></Field>
          <Field label="Confirmación Poder"><SelectBool value={form.confirmacion_poder} onChange={(v) => updateForm("confirmacion_poder", v)} /></Field>
        </FormSection>

        <FormSection title="3. CEN, montos y facturación">
          <Field label="Consulta CEN"><SelectYesNo value={form.consulta_cen} onChange={(v) => updateForm("consulta_cen", v)} /></Field>
          <Field label="Contenido CEN"><SelectYesNo value={form.contenido_cen} onChange={(v) => updateForm("contenido_cen", v)} /></Field>
          <Field label="Respuesta CEN"><SelectYesNo value={form.respuesta_cen} onChange={(v) => updateForm("respuesta_cen", v)} /></Field>
          <Field label="Estado Trabajador"><SelectStatus value={form.estado_trabajador} onChange={(v) => updateForm("estado_trabajador", v)} options={["Vigente", "No vigente", "Sin información"]} /></Field>
          <Field label="Motivo Tipo de exceso"><SelectStatus value={form.motivo_tipo_exceso} onChange={(v) => updateForm("motivo_tipo_exceso", v)} options={["LM", "TP", "LM + TP", "Otro"]} /></Field>
          <Field label="Monto Devolución"><input className="zoho-input" type="number" value={form.monto_devolucion} onChange={(e) => updateForm("monto_devolucion", e.target.value)} /></Field>
          <Field label="Monto Real Pagado"><input className="zoho-input" type="number" value={form.monto_pagado} onChange={(e) => updateForm("monto_pagado", e.target.value)} /></Field>
          <Field label="Monto cliente"><input className="zoho-input" type="number" value={form.monto_cliente} onChange={(e) => updateForm("monto_cliente", e.target.value)} /></Field>
          <Field label="Monto Finanfix"><input className="zoho-input" type="number" value={form.monto_finanfix_solutions} onChange={(e) => updateForm("monto_finanfix_solutions", e.target.value)} /></Field>
          <Field label="Monto real cliente"><input className="zoho-input" type="number" value={form.monto_real_cliente} onChange={(e) => updateForm("monto_real_cliente", e.target.value)} /></Field>
          <Field label="Monto real Finanfix Solutions"><input className="zoho-input" type="number" value={form.monto_real_finanfix_solutions} onChange={(e) => updateForm("monto_real_finanfix_solutions", e.target.value)} /></Field>
          <Field label="FEE"><input className="zoho-input" type="number" value={form.fee} onChange={(e) => updateForm("fee", e.target.value)} /></Field>
          <Field label="Facturado cliente"><SelectYesNo value={form.facturado_cliente} onChange={(v) => updateForm("facturado_cliente", v)} /></Field>
          <Field label="Facturado Finanfix"><SelectYesNo value={form.facturado_finanfix} onChange={(v) => updateForm("facturado_finanfix", v)} /></Field>
          <Field label="Fecha Pago AFP"><input className="zoho-input" type="date" value={form.fecha_pago_afp} onChange={(e) => updateForm("fecha_pago_afp", e.target.value)} /></Field>
          <Field label="Fecha Factura Finanfix"><input className="zoho-input" type="date" value={form.fecha_factura_finanfix} onChange={(e) => updateForm("fecha_factura_finanfix", e.target.value)} /></Field>
          <Field label="Fecha pago factura Finanfix"><input className="zoho-input" type="date" value={form.fecha_pago_factura_finanfix} onChange={(e) => updateForm("fecha_pago_factura_finanfix", e.target.value)} /></Field>
          <Field label="Fecha notificación cliente"><input className="zoho-input" type="date" value={form.fecha_notificacion_cliente} onChange={(e) => updateForm("fecha_notificacion_cliente", e.target.value)} /></Field>
          <Field label="N° Factura"><input className="zoho-input" value={form.numero_factura} onChange={(e) => updateForm("numero_factura", e.target.value)} /></Field>
          <Field label="N° OC"><input className="zoho-input" value={form.numero_oc} onChange={(e) => updateForm("numero_oc", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="4. Comentario">
          <Field label="Comentario"><textarea className="zoho-input zoho-textarea" value={form.comment} onChange={(e) => updateForm("comment", e.target.value)} /></Field>
        </FormSection>

        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={createRecord} disabled={saving}>{saving ? "Guardando..." : "Guardar Registro"}</button>
        </div>
      </ZohoModal>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="zoho-form-section"><h3>{title}</h3><div className="zoho-form-grid">{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="zoho-form-field"><label>{label}</label>{children}</div>;
}

function SelectStatus({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select className="zoho-select" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Seleccionar</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function SelectYesNo({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <SelectStatus value={value} onChange={onChange} options={["Sí", "No", "Pendiente"]} />;
}

function SelectBool({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="zoho-select" value={value} onChange={(e) => onChange(e.target.value)}><option value="false">No</option><option value="true">Sí</option></select>;
}
