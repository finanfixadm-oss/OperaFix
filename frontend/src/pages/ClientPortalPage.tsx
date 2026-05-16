import { useEffect, useMemo, useState } from "react";
import { publicBaseUrl, fetchJson } from "../api";
import type { RecordItem } from "../types-records";

type PortalView = "executive" | "cards" | "kanban" | "table";
type QuickFilter =
  | "todos"
  | "listos"
  | "pendientes"
  | "pagados"
  | "rechazados"
  | "sin_poder"
  | "sin_cc"
  | "alto_monto";

type GroupMetric = {
  name: string;
  count: number;
  amount: number;
  paid: number;
  ready: number;
  pending: number;
  paidCount: number;
  rejected: number;
  blockedPower: number;
  blockedCc: number;
};

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "listos", label: "Listos para gestionar" },
  { key: "pendientes", label: "Pendientes" },
  { key: "pagados", label: "Pagados / cerrados" },
  { key: "rechazados", label: "Rechazados" },
  { key: "sin_poder", label: "Falta poder" },
  { key: "sin_cc", label: "Falta CC" },
  { key: "alto_monto", label: "Alto monto" },
];

function money(value: unknown) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(
    String(value ?? "")
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function safe(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function norm(value: unknown) {
  return safe(value, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;

  const text = norm(value);

  return (
    text === "true" ||
    text === "si" ||
    text === "sí" ||
    text === "1" ||
    text === "confirmado" ||
    text === "confirmada"
  );
}

function rowMandante(row: RecordItem) {
  return safe(row.mandante?.name || (row as any).mandante, "Sin mandante");
}

function rowCompany(row: RecordItem) {
  return safe(row.razon_social || row.company?.razon_social, "Empresa sin razón social");
}

function rowRut(row: RecordItem) {
  return safe(row.rut || row.company?.rut, "Sin RUT");
}

function rowEntity(row: RecordItem) {
  return safe(row.entidad || row.lineAfp?.afp_name, "Sin AFP");
}

function rowStatus(row: RecordItem) {
  return safe(row.estado_gestion, "Pendiente Gestión");
}

function rowAmount(row: RecordItem) {
  return toNumber(row.monto_devolucion);
}

function rowPaid(row: RecordItem) {
  return toNumber(row.monto_pagado || (row as any).actual_paid_amount);
}

function isPending(row: RecordItem) {
  const status = norm(rowStatus(row));
  return status.includes("pend");
}

function isPaid(row: RecordItem) {
  const status = norm(rowStatus(row));
  return status.includes("pag") || status.includes("cerr") || status.includes("factur");
}

function isRejected(row: RecordItem) {
  const status = norm(rowStatus(row));
  return status.includes("rechaz") || norm(row.motivo_rechazo).includes("rechaz");
}

function isReady(row: RecordItem) {
  return (
    bool(row.confirmacion_poder) &&
    bool(row.confirmacion_cc) &&
    rowAmount(row) > 0 &&
    isPending(row)
  );
}

function publicDocUrl(fileUrl?: string | null) {
  if (!fileUrl) return "#";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${publicBaseUrl}${fileUrl}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL");
}

function stageIndex(status?: string | null) {
  const text = norm(status);

  if (/rechaz/.test(text)) return 1;
  if (/pag|factur|cerrad/.test(text)) return 4;
  if (/respuesta|respond|confirm|gestionado|solicitud/.test(text)) return 3;
  if (/ingreso|enviad|present/.test(text)) return 2;

  return 1;
}

function stageName(row: RecordItem) {
  const status = norm(rowStatus(row));

  if (/rechaz/.test(status)) return "Observados / rechazados";
  if (/pag|factur|cerrad/.test(status)) return "Pago / cierre";
  if (/respuesta|respond|confirm|gestionado|solicitud/.test(status)) return "Respuesta / seguimiento";
  if (/ingreso|enviad|present/.test(status)) return "Ingresados AFP";

  return "Preparación";
}

function semaforo(row: RecordItem) {
  if (isRejected(row)) return { label: "Revisar rechazo", tone: "danger" };
  if (isPaid(row)) return { label: "Cerrado / pagado", tone: "success" };
  if (!bool(row.confirmacion_poder)) return { label: "Falta poder", tone: "danger" };
  if (!bool(row.confirmacion_cc)) return { label: "Falta CC", tone: "warning" };
  if (rowAmount(row) <= 0) return { label: "Sin monto", tone: "muted" };
  if (isReady(row)) return { label: "Listo", tone: "success" };

  return { label: "En seguimiento", tone: "info" };
}

function exportCsv(filename: string, rows: RecordItem[]) {
  const headers = [
    "Mandante",
    "Razón Social",
    "RUT",
    "AFP",
    "Estado Gestión",
    "Monto Devolución",
    "Monto Pagado",
    "N° Solicitud",
    "Poder",
    "CC",
    "Tipo",
    "Fecha Pago AFP",
    "Fecha notificación cliente",
    "Documentos",
    "Comentario",
  ];

  const body = rows.map((row) => [
    rowMandante(row),
    rowCompany(row),
    rowRut(row),
    rowEntity(row),
    rowStatus(row),
    String(rowAmount(row)),
    String(rowPaid(row)),
    safe(row.numero_solicitud, ""),
    bool(row.confirmacion_poder) ? "Sí" : "No",
    bool(row.confirmacion_cc) ? "Sí" : "No",
    safe(row.management_type || row.motivo_tipo_exceso, ""),
    formatDate(row.fecha_pago_afp),
    formatDate(row.fecha_notificacion_cliente),
    String((row.documents || []).length),
    safe(row.comment, ""),
  ]);

  const csv = [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function downloadExecutiveHtml(rows: RecordItem[], title = "Informe ejecutivo Portal Cliente") {
  const totalAmount = rows.reduce((sum, row) => sum + rowAmount(row), 0);
  const totalPaid = rows.reduce((sum, row) => sum + rowPaid(row), 0);
  const byAfp = groupRows(rows, rowEntity).slice(0, 12);

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;margin:32px;background:#f8fafc}
h1{margin:0 0 8px;font-size:26px}
p{color:#475569}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}
.kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
.kpi span{display:block;color:#64748b;font-size:11px;text-transform:uppercase;font-weight:700}
.kpi strong{display:block;font-size:20px;margin-top:6px}
table{width:100%;border-collapse:collapse;background:#fff;margin-top:18px}
th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:12px}
th{background:#eef2ff}
</style>
</head>
<body>
<h1>${title}</h1>
<p>Generado desde OperaFix Portal Cliente el ${new Date().toLocaleString("es-CL")}.</p>
<div class="kpis">
  <div class="kpi"><span>Gestiones</span><strong>${rows.length}</strong></div>
  <div class="kpi"><span>Monto devolución</span><strong>${money(totalAmount)}</strong></div>
  <div class="kpi"><span>Monto pagado</span><strong>${money(totalPaid)}</strong></div>
  <div class="kpi"><span>Listos</span><strong>${rows.filter(isReady).length}</strong></div>
</div>
<h2>Resumen por AFP</h2>
<table>
<thead><tr><th>AFP</th><th>Casos</th><th>Monto</th><th>Pagado</th><th>Listos</th><th>Falta poder</th><th>Falta CC</th></tr></thead>
<tbody>
${byAfp.map((item) => `<tr><td>${item.name}</td><td>${item.count}</td><td>${money(item.amount)}</td><td>${money(item.paid)}</td><td>${item.ready}</td><td>${item.blockedPower}</td><td>${item.blockedCc}</td></tr>`).join("")}
</tbody>
</table>
<h2>Detalle</h2>
<table>
<thead><tr><th>Empresa</th><th>RUT</th><th>AFP</th><th>Estado</th><th>Monto</th><th>Poder</th><th>CC</th><th>Solicitud</th></tr></thead>
<tbody>
${rows.map((row) => `<tr><td>${rowCompany(row)}</td><td>${rowRut(row)}</td><td>${rowEntity(row)}</td><td>${rowStatus(row)}</td><td>${money(rowAmount(row))}</td><td>${bool(row.confirmacion_poder) ? "Sí" : "No"}</td><td>${bool(row.confirmacion_cc) ? "Sí" : "No"}</td><td>${safe(row.numero_solicitud, "")}</td></tr>`).join("")}
</tbody>
</table>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "portal_cliente_informe_ejecutivo.html";
  link.click();

  URL.revokeObjectURL(url);
}

function groupRows(rows: RecordItem[], keyGetter: (row: RecordItem) => string): GroupMetric[] {
  const map = new Map<string, GroupMetric>();

  rows.forEach((row) => {
    const name = keyGetter(row);
    const current =
      map.get(name) ||
      {
        name,
        count: 0,
        amount: 0,
        paid: 0,
        ready: 0,
        pending: 0,
        paidCount: 0,
        rejected: 0,
        blockedPower: 0,
        blockedCc: 0,
      };

    current.count += 1;
    current.amount += rowAmount(row);
    current.paid += rowPaid(row);

    if (isReady(row)) current.ready += 1;
    if (isPending(row)) current.pending += 1;
    if (isPaid(row)) current.paidCount += 1;
    if (isRejected(row)) current.rejected += 1;
    if (!bool(row.confirmacion_poder)) current.blockedPower += 1;
    if (!bool(row.confirmacion_cc)) current.blockedCc += 1;

    map.set(name, current);
  });

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount || b.count - a.count);
}

function quickFilterMatches(row: RecordItem, filter: QuickFilter) {
  if (filter === "listos") return isReady(row);
  if (filter === "pendientes") return isPending(row);
  if (filter === "pagados") return isPaid(row);
  if (filter === "rechazados") return isRejected(row);
  if (filter === "sin_poder") return !bool(row.confirmacion_poder);
  if (filter === "sin_cc") return !bool(row.confirmacion_cc);
  if (filter === "alto_monto") return rowAmount(row) >= 1000000;

  return true;
}

export default function ClientPortalPage() {
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMandante, setSelectedMandante] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedEntity, setSelectedEntity] = useState("todos");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todos");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PortalView>("executive");
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await fetchJson<RecordItem[]>("/portal/records"));
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar el portal cliente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const mandantes = useMemo(
    () => Array.from(new Set(rows.map((row) => rowMandante(row)))).sort(),
    [rows]
  );

  const estados = useMemo(
    () => Array.from(new Set(rows.map((row) => rowStatus(row)))).sort(),
    [rows]
  );

  const entities = useMemo(
    () => Array.from(new Set(rows.map((row) => rowEntity(row)))).sort(),
    [rows]
  );

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesMandante = selectedMandante === "todos" || rowMandante(row) === selectedMandante;
        const matchesEstado = selectedEstado === "todos" || rowStatus(row) === selectedEstado;
        const matchesEntity = selectedEntity === "todos" || rowEntity(row) === selectedEntity;
        const matchesQuick = quickFilterMatches(row, quickFilter);
        const q = norm(search);

        const matchesSearch =
          !q ||
          [
            rowCompany(row),
            rowRut(row),
            rowEntity(row),
            rowStatus(row),
            row.numero_solicitud,
            row.grupo_empresa,
            row.mandante?.name,
            (row as any).mandante,
          ]
            .filter(Boolean)
            .some((value) => norm(value).includes(q));

        return matchesMandante && matchesEstado && matchesEntity && matchesQuick && matchesSearch;
      }),
    [rows, selectedMandante, selectedEstado, selectedEntity, quickFilter, search]
  );

  const totals = useMemo(
    () => ({
      count: visibleRows.length,
      amount: visibleRows.reduce((sum, row) => sum + rowAmount(row), 0),
      paid: visibleRows.reduce((sum, row) => sum + rowPaid(row), 0),
      docs: visibleRows.reduce((sum, row) => sum + (row.documents || []).length, 0),
      ready: visibleRows.filter(isReady).length,
      pending: visibleRows.filter(isPending).length,
      paidCount: visibleRows.filter(isPaid).length,
      rejected: visibleRows.filter(isRejected).length,
      blockedPower: visibleRows.filter((row) => !bool(row.confirmacion_poder)).length,
      blockedCc: visibleRows.filter((row) => !bool(row.confirmacion_cc)).length,
      highAmount: visibleRows.filter((row) => rowAmount(row) >= 1000000).length,
    }),
    [visibleRows]
  );

  const byAfp = useMemo(() => groupRows(visibleRows, rowEntity), [visibleRows]);
  const byStatus = useMemo(() => groupRows(visibleRows, rowStatus), [visibleRows]);
  const byMandante = useMemo(() => groupRows(visibleRows, rowMandante), [visibleRows]);

  const kanbanGroups = useMemo(() => {
    const stages = [
      "Preparación",
      "Ingresados AFP",
      "Respuesta / seguimiento",
      "Pago / cierre",
      "Observados / rechazados",
    ];

    return stages.map((stage) => ({
      stage,
      rows: visibleRows.filter((row) => stageName(row) === stage),
    }));
  }, [visibleRows]);

  function clearAfpFilter() {
    setSelectedEntity("todos");
  }

  function exportCurrentView() {
    exportCsv("portal_cliente_operafix_vista_filtrada.csv", visibleRows);
  }

  return (
    <div className="zoho-module-page client-portal-page portal-exec-page">
      <section className="portal-exec-hero">
        <div>
          <span className="portal-exec-eyebrow">Portal Cliente</span>
          <h1>Seguimiento ejecutivo de gestiones LM / TP</h1>
          <p>
            Vista gráfica y consultiva para revisar estados, montos, AFP, bloqueos, documentos,
            trazabilidad y descargar informes de la gestión.
          </p>
        </div>

        <div className="portal-exec-actions">
          <select
            className="zoho-select"
            value={selectedMandante}
            onChange={(event) => setSelectedMandante(event.target.value)}
            disabled={user?.role === "cliente"}
          >
            <option value="todos">Todos los mandantes</option>
            {mandantes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="zoho-select"
            value={selectedEstado}
            onChange={(event) => setSelectedEstado(event.target.value)}
          >
            <option value="todos">Todos los estados</option>
            {estados.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="zoho-select"
            value={selectedEntity}
            onChange={(event) => setSelectedEntity(event.target.value)}
          >
            <option value="todos">Todas las AFP</option>
            {entities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <input
            className="zoho-input"
            placeholder="Buscar RUT, empresa, AFP o solicitud..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="portal-exec-action-row">
            <button className="zoho-btn" onClick={load}>
              {loading ? "Cargando..." : "Actualizar"}
            </button>
            <button className="zoho-btn zoho-btn-primary" onClick={exportCurrentView}>
              Descargar Excel
            </button>
          </div>

          <button className="zoho-btn portal-exec-report-btn" onClick={() => downloadExecutiveHtml(visibleRows)}>
            Informe ejecutivo
          </button>
        </div>
      </section>

      <section className="portal-exec-kpi-grid">
        <PortalKpi title="Gestiones visibles" value={totals.count} helper="Casos dentro del filtro activo" />
        <PortalKpi title="Monto devolución" value={money(totals.amount)} helper="Total estimado/gestionado" />
        <PortalKpi title="Monto pagado" value={money(totals.paid)} helper="Total pagado AFP" />
        <PortalKpi title="Listos" value={totals.ready} helper="Poder + CC + monto + pendiente" />
        <PortalKpi title="Pendientes" value={totals.pending} helper="Casos pendientes de gestión" />
        <PortalKpi title="Pagados/cerrados" value={totals.paidCount} helper="Casos con cierre positivo" />
        <PortalKpi title="Falta poder" value={totals.blockedPower} helper="Requieren acción legal/KAM" />
        <PortalKpi title="Falta CC" value={totals.blockedCc} helper="Requieren datos bancarios" />
      </section>

      <section className="portal-exec-filter-card">
        <div>
          <strong>Filtros rápidos</strong>
          <span>
            {selectedEntity !== "todos"
              ? `AFP activa: ${selectedEntity}`
              : "Selecciona un filtro o pincha una AFP para revisar el detalle."}
          </span>
        </div>

        <div className="portal-exec-quick-filters">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.key}
              className={quickFilter === filter.key ? "active" : ""}
              onClick={() => setQuickFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
          {selectedEntity !== "todos" && <button onClick={clearAfpFilter}>Limpiar AFP</button>}
        </div>
      </section>

      <section className="portal-exec-afp-section">
        <div className="portal-exec-section-title">
          <div>
            <span>Resumen por AFP</span>
            <h2>Distribución de montos y estados por entidad</h2>
          </div>
          <button className="zoho-btn" onClick={() => exportCsv("portal_cliente_resumen_afp.csv", visibleRows)}>
            Exportar vista
          </button>
        </div>

        <div className="portal-afp-summary-grid">
          {byAfp.length === 0 ? (
            <div className="zoho-empty">No hay AFP para el filtro seleccionado.</div>
          ) : (
            byAfp.map((item) => (
              <button
                key={item.name}
                className={selectedEntity === item.name ? "portal-afp-card active" : "portal-afp-card"}
                onClick={() => setSelectedEntity(item.name)}
              >
                <div className="portal-afp-card-head">
                  <strong>{item.name}</strong>
                  <span>{item.count} casos</span>
                </div>
                <b>{money(item.amount)}</b>
                <div className="portal-afp-mini-grid">
                  <span>Listos <strong>{item.ready}</strong></span>
                  <span>Pend. <strong>{item.pending}</strong></span>
                  <span>Pag. <strong>{item.paidCount}</strong></span>
                  <span>Sin poder <strong>{item.blockedPower}</strong></span>
                  <span>Sin CC <strong>{item.blockedCc}</strong></span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="portal-exec-charts-grid">
        <PortalBarChart title="Casos por estado" rows={byStatus.slice(0, 10)} metric="count" />
        <PortalBarChart title="Monto por AFP" rows={byAfp.slice(0, 10)} metric="amount" />
        <PortalBarChart title="Monto por mandante" rows={byMandante.slice(0, 10)} metric="amount" />
      </section>

      <div className="portal-exec-tabs">
        <button className={view === "executive" ? "active" : ""} onClick={() => setView("executive")}>
          Ejecutivo
        </button>
        <button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>
          Tarjetas
        </button>
        <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
          Kanban
        </button>
        <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>
          Tabla
        </button>
      </div>

      {loading ? (
        <div className="zoho-empty">Cargando portal...</div>
      ) : (
        <>
          {view === "executive" && (
            <section className="portal-exec-table-card">
              <div className="portal-exec-section-title">
                <div>
                  <span>Detalle operacional</span>
                  <h2>Gestiones del cliente</h2>
                </div>
                <button className="zoho-btn zoho-btn-primary" onClick={exportCurrentView}>
                  Descargar informe actual
                </button>
              </div>
              <PortalTable rows={visibleRows} onOpen={setSelectedRecord} />
            </section>
          )}

          {view === "cards" && (
            <div className="portal-exec-card-grid">
              {visibleRows.length === 0 ? (
                <div className="zoho-empty">No hay gestiones para el filtro seleccionado.</div>
              ) : (
                visibleRows.map((row) => (
                  <PortalCard key={row.id} row={row} onOpen={() => setSelectedRecord(row)} />
                ))
              )}
            </div>
          )}

          {view === "kanban" && (
            <div className="portal-exec-kanban">
              {kanbanGroups.map((group) => (
                <div className="portal-exec-kanban-column" key={group.stage}>
                  <div className="portal-exec-kanban-title">
                    <strong>{group.stage}</strong>
                    <span>{group.rows.length}</span>
                  </div>

                  {group.rows.map((row) => {
                    const alert = semaforo(row);

                    return (
                      <button
                        key={row.id}
                        className="portal-exec-kanban-card"
                        onClick={() => setSelectedRecord(row)}
                      >
                        <strong>{rowCompany(row)}</strong>
                        <span>{rowRut(row)}</span>
                        <small>
                          {rowEntity(row)} · {money(rowAmount(row))}
                        </small>
                        <em className={`portal-exec-chip ${alert.tone}`}>{alert.label}</em>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {view === "table" && (
            <section className="portal-exec-table-card">
              <PortalTable rows={visibleRows} onOpen={setSelectedRecord} />
            </section>
          )}
        </>
      )}

      <PortalRecordDetail record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}

function PortalKpi({ title, value, helper }: { title: string; value: string | number; helper: string }) {
  return (
    <article className="portal-exec-kpi">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function PortalBarChart({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: GroupMetric[];
  metric: "count" | "amount";
}) {
  const max = Math.max(...rows.map((row) => (metric === "amount" ? row.amount : row.count)), 1);

  return (
    <article className="portal-exec-chart-card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <div className="zoho-empty">Sin datos</div>
      ) : (
        <div className="portal-exec-bars">
          {rows.map((row) => {
            const value = metric === "amount" ? row.amount : row.count;

            return (
              <div className="portal-exec-bar-row" key={row.name}>
                <div>
                  <strong>{row.name}</strong>
                  <span>{metric === "amount" ? money(row.amount) : `${row.count} casos`}</span>
                </div>
                <div className="portal-exec-bar-track">
                  <div style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function PortalTable({ rows, onOpen }: { rows: RecordItem[]; onOpen: (record: RecordItem) => void }) {
  return (
    <div className="portal-exec-table-wrap">
      <table className="portal-exec-table">
        <thead>
          <tr>
            <th>Razón Social</th>
            <th>RUT</th>
            <th>AFP</th>
            <th>Estado</th>
            <th>Monto Devolución</th>
            <th>Monto Pagado</th>
            <th>N° Solicitud</th>
            <th>Poder</th>
            <th>CC</th>
            <th>Docs</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11}>Sin gestiones para el filtro seleccionado.</td>
            </tr>
          ) : (
            rows.map((row) => {
              const alert = semaforo(row);

              return (
                <tr key={row.id}>
                  <td>{rowCompany(row)}</td>
                  <td>{rowRut(row)}</td>
                  <td>{rowEntity(row)}</td>
                  <td>
                    <span className="portal-exec-status">{rowStatus(row)}</span>
                  </td>
                  <td className="portal-exec-money">{money(rowAmount(row))}</td>
                  <td className="portal-exec-money">{money(rowPaid(row))}</td>
                  <td>{safe(row.numero_solicitud)}</td>
                  <td>{bool(row.confirmacion_poder) ? "Sí" : "No"}</td>
                  <td>{bool(row.confirmacion_cc) ? "Sí" : "No"}</td>
                  <td>
                    <span className={`portal-exec-chip ${alert.tone}`}>{alert.label}</span>
                  </td>
                  <td>
                    <button className="zoho-small-btn" onClick={() => onOpen(row)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function PortalCard({ row, onOpen }: { row: RecordItem; onOpen: () => void }) {
  const currentStage = stageIndex(row.estado_gestion);
  const alert = semaforo(row);

  return (
    <article className="portal-exec-card">
      <div className="portal-exec-card-head">
        <div>
          <h2>{rowCompany(row)}</h2>
          <p>
            {rowRut(row)} · {rowEntity(row)}
          </p>
        </div>
        <span className={`portal-exec-chip ${alert.tone}`}>{alert.label}</span>
      </div>

      <div className="portal-exec-progress">
        {["Preparación", "Ingreso", "Respuesta", "Pago/Cierre"].map((label, index) => (
          <div key={label} className={index + 1 <= currentStage ? "active" : ""}>
            <span>{index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <div className="portal-exec-card-metrics">
        <div>
          <span>Monto devolución</span>
          <strong>{money(rowAmount(row))}</strong>
        </div>
        <div>
          <span>N° solicitud</span>
          <strong>{safe(row.numero_solicitud)}</strong>
        </div>
        <div>
          <span>Tipo</span>
          <strong>{safe(row.management_type || row.motivo_tipo_exceso)}</strong>
        </div>
      </div>

      <div className="portal-exec-card-metrics secondary">
        <div>
          <span>Poder</span>
          <strong>{bool(row.confirmacion_poder) ? "Confirmado" : "Pendiente"}</strong>
        </div>
        <div>
          <span>Cuenta CC</span>
          <strong>{bool(row.confirmacion_cc) ? "Confirmada" : "Pendiente"}</strong>
        </div>
        <div>
          <span>Fecha pago</span>
          <strong>{formatDate(row.fecha_pago_afp)}</strong>
        </div>
      </div>

      <button className="zoho-btn zoho-btn-primary" onClick={onOpen}>
        Ver detalle del caso
      </button>
    </article>
  );
}

function PortalRecordDetail({ record, onClose }: { record: RecordItem | null; onClose: () => void }) {
  if (!record) return null;

  const alert = semaforo(record);

  return (
    <div className="portal-exec-detail-backdrop" onClick={onClose}>
      <aside className="portal-exec-detail-panel" onClick={(event) => event.stopPropagation()}>
        <div className="portal-exec-detail-head">
          <div>
            <span>Detalle del caso</span>
            <h2>{rowCompany(record)}</h2>
            <p>
              {rowRut(record)} · {rowEntity(record)} · {rowStatus(record)}
            </p>
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <div className="portal-exec-detail-kpis">
          <div>
            <span>Monto devolución</span>
            <strong>{money(rowAmount(record))}</strong>
          </div>
          <div>
            <span>Monto pagado</span>
            <strong>{money(rowPaid(record))}</strong>
          </div>
          <div>
            <span>Semáforo</span>
            <strong className={`portal-exec-chip ${alert.tone}`}>{alert.label}</strong>
          </div>
        </div>

        <section className="portal-exec-detail-section">
          <h3>Estado operacional</h3>
          <div className="portal-exec-detail-grid">
            <Field label="Mandante" value={rowMandante(record)} />
            <Field label="N° Solicitud" value={safe(record.numero_solicitud)} />
            <Field label="Tipo" value={safe(record.management_type || record.motivo_tipo_exceso)} />
            <Field label="Poder" value={bool(record.confirmacion_poder) ? "Confirmado" : "Pendiente"} />
            <Field label="Cuenta corriente" value={bool(record.confirmacion_cc) ? "Confirmada" : "Pendiente"} />
            <Field label="Grupo empresa" value={safe(record.grupo_empresa)} />
          </div>
        </section>

        <section className="portal-exec-detail-section">
          <h3>Trazabilidad</h3>
          <div className="portal-exec-detail-grid">
            <Field label="Fecha presentación AFP" value={formatDate(record.fecha_presentacion_afp)} />
            <Field label="Fecha ingreso AFP" value={formatDate(record.fecha_ingreso_afp)} />
            <Field label="Fecha pago AFP" value={formatDate(record.fecha_pago_afp)} />
            <Field label="Fecha notificación cliente" value={formatDate(record.fecha_notificacion_cliente)} />
            <Field label="Actualizado" value={formatDate(record.updated_at)} />
            <Field label="Última actividad" value={formatDate(record.last_activity_at)} />
          </div>
        </section>

        <section className="portal-exec-detail-section">
          <h3>Documentos visibles</h3>
          {(record.documents || []).length === 0 ? (
            <p className="portal-exec-muted">Sin documentos visibles para este caso.</p>
          ) : (
            <div className="portal-exec-doc-list">
              {(record.documents || []).map((doc) => (
                <a key={doc.id} href={publicDocUrl(doc.file_url)} target="_blank" rel="noreferrer">
                  <span>{doc.category || "Documento"}</span>
                  {doc.file_name}
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="portal-exec-detail-section">
          <h3>Comentario</h3>
          <p className="portal-exec-muted">{safe(record.comment, "Sin comentario visible.")}</p>
        </section>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="portal-exec-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
