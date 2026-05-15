import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicBaseUrl, fetchJson } from "../api";
import type { RecordItem } from "../types-records";

function money(value: unknown) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function safe(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function norm(value: unknown) {
  return safe(value, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function publicDocUrl(fileUrl?: string | null) {
  if (!fileUrl) return "#";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${publicBaseUrl}${fileUrl}`;
}

function exportCsv(filename: string, rows: RecordItem[]) {
  const headers = ["Mandante", "Empresa", "RUT", "AFP", "Estado", "Monto", "Solicitud", "Poder", "CC", "Documentos"];
  const body = rows.map((row) => [
    row.mandante?.name || (row as any).mandante || "",
    row.razon_social || row.company?.razon_social || "",
    row.rut || row.company?.rut || "",
    row.entidad || row.lineAfp?.afp_name || "",
    row.estado_gestion || "",
    String(row.monto_devolucion || ""),
    row.numero_solicitud || "",
    row.confirmacion_poder ? "Sí" : "No",
    row.confirmacion_cc ? "Sí" : "No",
    String((row.documents || []).length),
  ]);
  const csv = [headers, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function stageIndex(status?: string | null) {
  const text = norm(status);
  if (/rechaz/.test(text)) return 1;
  if (/pag|factur|cerrad/.test(text)) return 4;
  if (/respuesta|confirm|gestionado|solicitud/.test(text)) return 3;
  if (/ingreso|enviad|present/.test(text)) return 2;
  return 1;
}

function stageName(row: RecordItem) {
  const status = norm(row.estado_gestion);
  if (/rechaz/.test(status)) return "Observados / rechazados";
  if (/pag|factur|cerrad/.test(status)) return "Pago / cierre";
  if (/respuesta|confirm|gestionado|solicitud/.test(status)) return "Respuesta / seguimiento";
  if (/ingreso|enviad|present/.test(status)) return "Ingresados AFP";
  return "Preparación";
}

function semaforo(row: RecordItem) {
  if (!row.confirmacion_poder) return { label: "Falta poder", tone: "danger" };
  if (!row.confirmacion_cc) return { label: "Falta CC", tone: "warning" };
  if (!(row.documents || []).length) return { label: "Faltan docs", tone: "warning" };
  if (Number(row.monto_devolucion || 0) <= 0) return { label: "Sin monto", tone: "muted" };
  return { label: "Listo", tone: "success" };
}

type PortalView = "cards" | "kanban" | "table";

export default function ClientPortalPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMandante, setSelectedMandante] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedEntity, setSelectedEntity] = useState("todos");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PortalView>("cards");

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

  const mandantes = useMemo(() => Array.from(new Set(rows.map((row) => safe(row.mandante?.name || (row as any).mandante, "Sin mandante")))).sort(), [rows]);
  const estados = useMemo(() => Array.from(new Set(rows.map((row) => safe(row.estado_gestion, "Sin estado")))).sort(), [rows]);
  const entities = useMemo(() => Array.from(new Set(rows.map((row) => safe(row.entidad || row.lineAfp?.afp_name, "Sin entidad")))).sort(), [rows]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    const mandante = safe(row.mandante?.name || (row as any).mandante, "Sin mandante");
    const estado = safe(row.estado_gestion, "Sin estado");
    const entity = safe(row.entidad || row.lineAfp?.afp_name, "Sin entidad");
    const matchesMandante = selectedMandante === "todos" || mandante === selectedMandante;
    const matchesEstado = selectedEstado === "todos" || estado === selectedEstado;
    const matchesEntity = selectedEntity === "todos" || entity === selectedEntity;
    const q = norm(search);
    const matchesSearch = !q || [row.razon_social, row.company?.razon_social, row.rut, row.company?.rut, row.entidad, row.estado_gestion, row.numero_solicitud, row.grupo_empresa]
      .filter(Boolean).some((value) => norm(value).includes(q));
    return matchesMandante && matchesEstado && matchesEntity && matchesSearch;
  }), [rows, selectedMandante, selectedEstado, selectedEntity, search]);

  const totals = useMemo(() => ({
    count: visibleRows.length,
    amount: visibleRows.reduce((sum, row) => sum + Number(row.monto_devolucion || 0), 0),
    paid: visibleRows.reduce((sum, row) => sum + Number((row as any).monto_pagado || 0), 0),
    docs: visibleRows.reduce((sum, row) => sum + (row.documents || []).length, 0),
    ready: visibleRows.filter((row) => row.confirmacion_cc && row.confirmacion_poder && Number(row.monto_devolucion || 0) > 0).length,
    blockedPower: visibleRows.filter((row) => !row.confirmacion_poder).length,
    blockedCc: visibleRows.filter((row) => !row.confirmacion_cc).length,
  }), [visibleRows]);

  const kanbanGroups = useMemo(() => {
    const stages = ["Preparación", "Ingresados AFP", "Respuesta / seguimiento", "Pago / cierre", "Observados / rechazados"];
    return stages.map((stage) => ({
      stage,
      rows: visibleRows.filter((row) => stageName(row) === stage),
    }));
  }, [visibleRows]);

  return (
    <div className="zoho-module-page client-portal-page portal-pro-page">
      <div className="portal-hero portal-pro-hero">
        <div>
          <p className="eyebrow">Portal cliente PRO</p>
          <h1>Seguimiento ejecutivo de gestiones LM / TP</h1>
          <p>Estado operacional, documentos, montos, trazabilidad visible y semáforo de avance para cada caso.</p>
        </div>
        <div className="portal-hero-actions">
          <select className="zoho-select" value={selectedMandante} onChange={(e) => setSelectedMandante(e.target.value)} disabled={user?.role === "cliente"}>
            <option value="todos">Todos los mandantes</option>
            {mandantes.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className="zoho-select" value={selectedEstado} onChange={(e) => setSelectedEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {estados.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className="zoho-select" value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)}>
            <option value="todos">Todas las AFP</option>
            {entities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <input className="zoho-input" placeholder="Buscar RUT, empresa, AFP o solicitud..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="zoho-btn" onClick={load}>{loading ? "Cargando..." : "Actualizar"}</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => exportCsv("portal_cliente_operafix.csv", visibleRows)}>Exportar</button>
        </div>
      </div>

      <section className="portal-summary-strip portal-pro-summary">
        <div><span>Gestiones visibles</span><strong>{totals.count}</strong></div>
        <div><span>Monto devolución</span><strong>{money(totals.amount)}</strong></div>
        <div><span>Monto pagado</span><strong>{money(totals.paid)}</strong></div>
        <div><span>Listas</span><strong>{totals.ready}</strong></div>
        <div><span>Falta poder</span><strong>{totals.blockedPower}</strong></div>
        <div><span>Falta CC</span><strong>{totals.blockedCc}</strong></div>
      </section>

      <div className="portal-view-tabs">
        <button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>Tarjetas</button>
        <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>Kanban</button>
        <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Tabla</button>
      </div>

      {loading ? <div className="zoho-empty">Cargando portal...</div> : (
        <>
          {view === "cards" && <div className="portal-record-grid">
            {visibleRows.length === 0 ? <div className="zoho-empty">No hay gestiones para el filtro seleccionado.</div> : visibleRows.map((row) => <PortalCard key={row.id} row={row} />)}
          </div>}

          {view === "kanban" && <div className="portal-kanban-board">
            {kanbanGroups.map((group) => <div className="portal-kanban-column" key={group.stage}>
              <div className="portal-kanban-title"><strong>{group.stage}</strong><span>{group.rows.length}</span></div>
              {group.rows.map((row) => {
                const alert = semaforo(row);
                return <button key={row.id} className="portal-kanban-card" onClick={() => navigate(`/records/${row.id}`)}>
                  <strong>{row.razon_social || row.company?.razon_social || "Empresa"}</strong>
                  <span>{row.rut || row.company?.rut || "Sin RUT"}</span>
                  <small>{row.entidad || row.lineAfp?.afp_name || "Sin AFP"} · {money(row.monto_devolucion)}</small>
                  <em className={`portal-chip ${alert.tone}`}>{alert.label}</em>
                </button>;
              })}
            </div>)}
          </div>}

          {view === "table" && <div className="zoho-card portal-table-card">
            <div className="zoho-table-scroll">
              <table className="zoho-table compact">
                <thead><tr><th>Empresa</th><th>RUT</th><th>AFP</th><th>Estado</th><th>Monto</th><th>Poder</th><th>CC</th><th>Docs</th></tr></thead>
                <tbody>{visibleRows.map((row) => {
                  const alert = semaforo(row);
                  return <tr key={row.id} onClick={() => navigate(`/records/${row.id}`)} className="clickable-row">
                    <td>{row.razon_social || row.company?.razon_social || "—"}</td>
                    <td>{row.rut || row.company?.rut || "—"}</td>
                    <td>{row.entidad || row.lineAfp?.afp_name || "—"}</td>
                    <td><span className="status-pill">{row.estado_gestion || "Pendiente"}</span></td>
                    <td>{money(row.monto_devolucion)}</td>
                    <td>{row.confirmacion_poder ? "Sí" : "No"}</td>
                    <td>{row.confirmacion_cc ? "Sí" : "No"}</td>
                    <td><span className={`portal-chip ${alert.tone}`}>{alert.label}</span></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </div>}
        </>
      )}
    </div>
  );
}

function PortalCard({ row }: { row: RecordItem }) {
  const currentStage = stageIndex(row.estado_gestion);
  const alert = semaforo(row);
  return (
    <article className="portal-card portal-pro-card">
      <div className="portal-card-head">
        <div>
          <h2>{row.razon_social || row.company?.razon_social || "Empresa sin razón social"}</h2>
          <p>{row.rut || row.company?.rut || "Sin RUT"} · {row.entidad || row.lineAfp?.afp_name || "Sin entidad"}</p>
        </div>
        <span className={`portal-chip ${alert.tone}`}>{alert.label}</span>
      </div>

      <div className="portal-progress">
        {["Preparación", "Ingreso", "Respuesta", "Pago/Cierre"].map((label, index) => (
          <div key={label} className={index + 1 <= currentStage ? "active" : ""}><span>{index + 1}</span><small>{label}</small></div>
        ))}
      </div>

      <div className="portal-card-metrics">
        <div><span>Monto devolución</span><strong>{money(row.monto_devolucion)}</strong></div>
        <div><span>N° solicitud</span><strong>{row.numero_solicitud || "—"}</strong></div>
        <div><span>Tipo</span><strong>{row.management_type || row.motivo_tipo_exceso || "—"}</strong></div>
      </div>

      <div className="portal-card-metrics portal-card-metrics-secondary">
        <div><span>Poder</span><strong>{row.confirmacion_poder ? "Confirmado" : "Pendiente"}</strong></div>
        <div><span>Cuenta CC</span><strong>{row.confirmacion_cc ? "Confirmada" : "Pendiente"}</strong></div>
        <div><span>Fecha pago</span><strong>{row.fecha_pago_afp ? new Date(row.fecha_pago_afp).toLocaleDateString("es-CL") : "—"}</strong></div>
      </div>

      <div className="portal-documents">
        <strong>Documentos disponibles</strong>
        {(row.documents || []).length === 0 ? <p>Sin documentos visibles.</p> : (row.documents || []).slice(0, 7).map((doc) => (
          <a key={doc.id} href={publicDocUrl(doc.file_url)} target="_blank" rel="noreferrer"><span>{doc.category || "Documento"}</span>{doc.file_name}</a>
        ))}
      </div>
    </article>
  );
}
