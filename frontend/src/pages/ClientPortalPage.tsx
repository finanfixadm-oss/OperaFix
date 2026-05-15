import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicBaseUrl, fetchJson } from "../api";
import type { RecordItem } from "../types-records";

function money(value: unknown) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function safe(value: unknown, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function publicDocUrl(fileUrl?: string | null) {
  if (!fileUrl) return "#";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${publicBaseUrl}${fileUrl}`;
}

function exportCsv(filename: string, rows: RecordItem[]) {
  const headers = [
    "Mandante",
    "Empresa",
    "RUT",
    "AFP",
    "Estado",
    "Monto devolución",
    "Solicitud",
    "Poder",
    "CC",
    "Documentos",
  ];

  const body = rows.map((row: any) => [
    row.mandante?.name || row.mandante || "",
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

function stageIndex(status?: string | null) {
  const text = normalize(status);
  if (/rechaz/.test(text)) return 1;
  if (/pag|factur|cerr/.test(text)) return 4;
  if (/respuesta|respond|confirm/.test(text)) return 3;
  if (/ingreso|enviad|present|afp/.test(text)) return 2;
  return 1;
}

function statusBucket(status?: string | null) {
  const text = normalize(status);
  if (/pag|factur|cerr/.test(text)) return "Cierre / pago";
  if (/rechaz/.test(text)) return "Rechazados";
  if (/respuesta|respond|confirm/.test(text)) return "Respuesta AFP";
  if (/ingreso|enviad|present|afp/.test(text)) return "Ingresados AFP";
  return "Preparación";
}

function recordAmount(row: RecordItem) {
  return Number((row as any).monto_devolucion || 0);
}

function recordCompany(row: RecordItem) {
  return safe((row as any).razon_social || row.company?.razon_social, "Empresa sin razón social");
}

function recordRut(row: RecordItem) {
  return safe((row as any).rut || row.company?.rut, "Sin RUT");
}

function recordEntity(row: RecordItem) {
  return safe((row as any).entidad || row.lineAfp?.afp_name, "Sin entidad");
}

export default function ClientPortalPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMandante, setSelectedMandante] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedAfp, setSelectedAfp] = useState("todos");
  const [viewMode, setViewMode] = useState<"cards" | "kanban" | "table">("cards");
  const [search, setSearch] = useState("");

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
    () => Array.from(new Set(rows.map((row: any) => safe(row.mandante?.name || row.mandante, "Sin mandante")))).sort(),
    [rows]
  );

  const estados = useMemo(
    () => Array.from(new Set(rows.map((row: any) => safe(row.estado_gestion, "Sin estado")))).sort(),
    [rows]
  );

  const afps = useMemo(
    () => Array.from(new Set(rows.map(recordEntity))).sort(),
    [rows]
  );

  const visibleRows = useMemo(() => {
    return rows.filter((row: any) => {
      const mandante = safe(row.mandante?.name || row.mandante, "Sin mandante");
      const estado = safe(row.estado_gestion, "Sin estado");
      const afp = recordEntity(row);
      const q = normalize(search);

      const matchesMandante = selectedMandante === "todos" || mandante === selectedMandante;
      const matchesEstado = selectedEstado === "todos" || estado === selectedEstado;
      const matchesAfp = selectedAfp === "todos" || afp === selectedAfp;
      const matchesSearch =
        !q ||
        [
          recordCompany(row),
          recordRut(row),
          afp,
          estado,
          row.numero_solicitud,
          row.grupo_empresa,
        ]
          .filter(Boolean)
          .some((value) => normalize(value).includes(q));

      return matchesMandante && matchesEstado && matchesAfp && matchesSearch;
    });
  }, [rows, selectedMandante, selectedEstado, selectedAfp, search]);

  const totals = useMemo(() => {
    const totalAmount = visibleRows.reduce((sum, row) => sum + recordAmount(row), 0);
    const docs = visibleRows.reduce((sum, row: any) => sum + (row.documents || []).length, 0);
    const ready = visibleRows.filter((row: any) => row.confirmacion_cc && row.confirmacion_poder && recordAmount(row) > 0).length;
    const blocked = visibleRows.filter((row: any) => !row.confirmacion_cc || !row.confirmacion_poder).length;
    const paid = visibleRows.filter((row: any) => /pag|factur|cerr/i.test(String(row.estado_gestion || ""))).length;

    return { count: visibleRows.length, amount: totalAmount, docs, ready, blocked, paid };
  }, [visibleRows]);

  const kanbanGroups = useMemo(() => {
    const groups = ["Preparación", "Ingresados AFP", "Respuesta AFP", "Cierre / pago", "Rechazados"];
    return groups.map((group) => ({
      group,
      rows: visibleRows.filter((row: any) => statusBucket(row.estado_gestion) === group),
    }));
  }, [visibleRows]);

  function openRecord(row: RecordItem) {
    if (!row.id) return;
    navigate(`/records/${row.id}`);
  }

  return (
    <div className="zoho-module-page client-portal-page">
      <div className="portal-hero">
        <div>
          <p className="eyebrow">Portal cliente PRO</p>
          <h1>Seguimiento ejecutivo de gestiones LM / TP</h1>
          <p>Vista consultiva para revisar avance, documentos, pagos, bloqueos y trazabilidad visible por mandante.</p>
        </div>
        <div className="portal-hero-actions">
          <select
            className="zoho-select"
            value={selectedMandante}
            onChange={(e) => setSelectedMandante(e.target.value)}
            disabled={Boolean(user?.role === "cliente")}
          >
            <option value="todos">Todos los mandantes</option>
            {mandantes.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select className="zoho-select" value={selectedEstado} onChange={(e) => setSelectedEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {estados.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select className="zoho-select" value={selectedAfp} onChange={(e) => setSelectedAfp(e.target.value)}>
            <option value="todos">Todas las AFP</option>
            {afps.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input className="zoho-input" placeholder="Buscar RUT, empresa, AFP, solicitud..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="zoho-btn" onClick={() => exportCsv("portal_cliente_operafix.csv", visibleRows)}>Exportar vista</button>
          <button className="zoho-btn" onClick={load}>Actualizar</button>
        </div>
      </div>

      <section className="portal-summary-strip">
        <div><span>Gestiones visibles</span><strong>{totals.count}</strong></div>
        <div><span>Monto devolución</span><strong>{money(totals.amount)}</strong></div>
        <div><span>Documentos</span><strong>{totals.docs}</strong></div>
        <div><span>Listas</span><strong>{totals.ready}</strong></div>
        <div><span>Bloqueadas</span><strong>{totals.blocked}</strong></div>
        <div><span>Pagadas / cerradas</span><strong>{totals.paid}</strong></div>
      </section>

      <section className="portal-view-switch">
        <button className={viewMode === "cards" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setViewMode("cards")}>Tarjetas</button>
        <button className={viewMode === "kanban" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setViewMode("kanban")}>Kanban</button>
        <button className={viewMode === "table" ? "zoho-btn zoho-btn-primary" : "zoho-btn"} onClick={() => setViewMode("table")}>Tabla</button>
      </section>

      {loading ? <div className="zoho-empty">Cargando portal...</div> : null}

      {!loading && viewMode === "cards" && (
        <div className="portal-record-grid">
          {visibleRows.length === 0 ? <div className="zoho-empty">No hay gestiones para el filtro seleccionado.</div> : null}
          {visibleRows.map((row: any) => {
            const currentStage = stageIndex(row.estado_gestion);
            return (
              <article className="portal-card" key={row.id}>
                <div className="portal-card-head">
                  <div>
                    <h2>{recordCompany(row)}</h2>
                    <p>{recordRut(row)} · {recordEntity(row)}</p>
                  </div>
                  <span className="status-pill">{row.estado_gestion || "Pendiente"}</span>
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
                  {(row.documents || []).length === 0 ? <p>Sin documentos visibles.</p> : (row.documents || []).slice(0, 7).map((doc: any) => (
                    <a key={doc.id} href={publicDocUrl(doc.file_url)} target="_blank" rel="noreferrer"><span>{doc.category || "Documento"}</span>{doc.file_name}</a>
                  ))}
                </div>

                <div className="portal-card-actions">
                  <button className="zoho-btn" onClick={() => openRecord(row)}>Abrir ficha</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && viewMode === "kanban" && (
        <div className="portal-kanban-grid">
          {kanbanGroups.map((group) => (
            <section className="portal-kanban-column" key={group.group}>
              <h2>{group.group} <span>{group.rows.length}</span></h2>
              {group.rows.map((row: any) => (
                <button className="portal-kanban-card" key={row.id} onClick={() => openRecord(row)}>
                  <strong>{recordCompany(row)}</strong>
                  <span>{recordRut(row)} · {recordEntity(row)}</span>
                  <b>{money(row.monto_devolucion)}</b>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}

      {!loading && viewMode === "table" && (
        <section className="zoho-card portal-table-card">
          <div className="zoho-table-scroll">
            <table className="zoho-table compact">
              <thead>
                <tr>
                  <th>Mandante</th>
                  <th>Empresa</th>
                  <th>RUT</th>
                  <th>AFP</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>Poder</th>
                  <th>CC</th>
                  <th>Documentos</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row: any) => (
                  <tr key={row.id} className="clickable-row" onClick={() => openRecord(row)}>
                    <td>{row.mandante?.name || row.mandante || "—"}</td>
                    <td>{recordCompany(row)}</td>
                    <td>{recordRut(row)}</td>
                    <td>{recordEntity(row)}</td>
                    <td><span className="status-pill">{row.estado_gestion || "—"}</span></td>
                    <td>{money(row.monto_devolucion)}</td>
                    <td>{row.confirmacion_poder ? "Sí" : "No"}</td>
                    <td>{row.confirmacion_cc ? "Sí" : "No"}</td>
                    <td>{(row.documents || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
