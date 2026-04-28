import { useEffect, useMemo, useState } from "react";
import { publicBaseUrl, fetchJson } from "../api";
import type { RecordItem } from "../types-records";

function money(value: unknown) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function safe(value: unknown, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

function publicDocUrl(fileUrl?: string | null) {
  if (!fileUrl) return "#";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${publicBaseUrl}${fileUrl}`;
}

function exportCsv(filename: string, rows: RecordItem[]) {
  const headers = ["Mandante", "Empresa", "RUT", "AFP", "Estado", "Monto", "Solicitud", "Documentos"];
  const body = rows.map((row) => [
    row.mandante?.name || (row as any).mandante || "",
    row.razon_social || row.company?.razon_social || "",
    row.rut || row.company?.rut || "",
    row.entidad || row.lineAfp?.afp_name || "",
    row.estado_gestion || "",
    String(row.monto_devolucion || ""),
    row.numero_solicitud || "",
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
  const text = String(status || "").toLowerCase();
  if (/rechaz/.test(text)) return 1;
  if (/pag|factur|cerrad/.test(text)) return 4;
  if (/respuesta|confirm|n°|numero|solicitud/.test(text)) return 3;
  if (/ingreso|enviad|present/.test(text)) return 2;
  return 1;
}

export default function ClientPortalPage() {
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMandante, setSelectedMandante] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      setRows(await fetchJson<RecordItem[]>("/records"));
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar el portal cliente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const mandantes = useMemo(() => Array.from(new Set(rows.map((row) => safe(row.mandante?.name || (row as any).mandante, "Sin mandante")))).sort(), [rows]);
  const estados = useMemo(() => Array.from(new Set(rows.map((row) => safe(row.estado_gestion, "Sin estado")))).sort(), [rows]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    const mandante = safe(row.mandante?.name || (row as any).mandante, "Sin mandante");
    const estado = safe(row.estado_gestion, "Sin estado");
    const matchesMandante = selectedMandante === "todos" || mandante === selectedMandante;
    const matchesEstado = selectedEstado === "todos" || estado === selectedEstado;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || [row.razon_social, row.company?.razon_social, row.rut, row.company?.rut, row.entidad, row.estado_gestion, row.numero_solicitud]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    return matchesMandante && matchesEstado && matchesSearch;
  }), [rows, selectedMandante, selectedEstado, search]);

  const totals = useMemo(() => ({
    count: visibleRows.length,
    amount: visibleRows.reduce((sum, row) => sum + Number(row.monto_devolucion || 0), 0),
    docs: visibleRows.reduce((sum, row) => sum + (row.documents || []).length, 0),
  }), [visibleRows]);

  return (
    <div className="zoho-module-page client-portal-page">
      <div className="portal-hero">
        <div>
          <p className="eyebrow">Portal cliente</p>
          <h1>Seguimiento de gestiones LM / TP</h1>
          <p>Vista consultiva para revisar estado, documentos, pagos, avance y trazabilidad visible por mandante.</p>
        </div>
        <div className="portal-hero-actions">
          <select className="zoho-select" value={selectedMandante} onChange={(e) => setSelectedMandante(e.target.value)}>
            <option value="todos">Todos los mandantes</option>
            {mandantes.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className="zoho-select" value={selectedEstado} onChange={(e) => setSelectedEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            {estados.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <input className="zoho-input" placeholder="Buscar RUT, empresa, AFP..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="zoho-btn" onClick={() => exportCsv("portal_cliente_operafix.csv", visibleRows)}>Exportar vista</button>
        </div>
      </div>

      <section className="portal-summary-strip">
        <div><span>Gestiones visibles</span><strong>{totals.count}</strong></div>
        <div><span>Monto devolución</span><strong>{money(totals.amount)}</strong></div>
        <div><span>Documentos disponibles</span><strong>{totals.docs}</strong></div>
      </section>

      {loading ? <div className="zoho-empty">Cargando portal...</div> : (
        <div className="portal-record-grid">
          {visibleRows.length === 0 ? <div className="zoho-empty">No hay gestiones para el filtro seleccionado.</div> : visibleRows.map((row) => {
            const currentStage = stageIndex(row.estado_gestion);
            return (
              <article className="portal-card" key={row.id}>
                <div className="portal-card-head">
                  <div>
                    <h2>{row.razon_social || row.company?.razon_social || "Empresa sin razón social"}</h2>
                    <p>{row.rut || row.company?.rut || "Sin RUT"} · {row.entidad || row.lineAfp?.afp_name || "Sin entidad"}</p>
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
                  {(row.documents || []).length === 0 ? <p>Sin documentos visibles.</p> : (row.documents || []).slice(0, 7).map((doc) => (
                    <a key={doc.id} href={publicDocUrl(doc.file_url)} target="_blank" rel="noreferrer"><span>{doc.category || "Documento"}</span>{doc.file_name}</a>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
