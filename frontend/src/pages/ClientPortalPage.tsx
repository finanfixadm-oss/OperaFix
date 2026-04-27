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

export default function ClientPortalPage() {
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMandante, setSelectedMandante] = useState("todos");
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
  const visibleRows = useMemo(() => rows.filter((row) => {
    const mandante = safe(row.mandante?.name || (row as any).mandante, "Sin mandante");
    const matchesMandante = selectedMandante === "todos" || mandante === selectedMandante;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || [row.razon_social, row.company?.razon_social, row.rut, row.company?.rut, row.entidad, row.estado_gestion, row.numero_solicitud]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    return matchesMandante && matchesSearch;
  }), [rows, selectedMandante, search]);

  return (
    <div className="zoho-module-page client-portal-page">
      <div className="portal-hero">
        <div>
          <p className="eyebrow">Portal cliente</p>
          <h1>Seguimiento de gestiones LM / TP</h1>
          <p>Vista consultiva para revisar estado, documentos, pagos y trazabilidad de gestiones por mandante.</p>
        </div>
        <div className="portal-hero-actions">
          <select className="zoho-select" value={selectedMandante} onChange={(e) => setSelectedMandante(e.target.value)}>
            <option value="todos">Todos los mandantes</option>
            {mandantes.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <input className="zoho-input" placeholder="Buscar RUT, empresa, AFP..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="zoho-empty">Cargando portal...</div> : (
        <div className="portal-record-grid">
          {visibleRows.length === 0 ? <div className="zoho-empty">No hay gestiones para el filtro seleccionado.</div> : visibleRows.map((row) => (
            <article className="portal-card" key={row.id}>
              <div className="portal-card-head">
                <div>
                  <h2>{row.razon_social || row.company?.razon_social || "Empresa sin razón social"}</h2>
                  <p>{row.rut || row.company?.rut || "Sin RUT"} · {row.entidad || row.lineAfp?.afp_name || "Sin entidad"}</p>
                </div>
                <span className="status-pill">{row.estado_gestion || "Pendiente"}</span>
              </div>

              <div className="portal-card-metrics">
                <div><span>Monto devolución</span><strong>{money(row.monto_devolucion)}</strong></div>
                <div><span>N° solicitud</span><strong>{row.numero_solicitud || "—"}</strong></div>
                <div><span>Tipo</span><strong>{row.management_type || row.motivo_tipo_exceso || "—"}</strong></div>
              </div>

              <div className="portal-documents">
                <strong>Documentos disponibles</strong>
                {(row.documents || []).length === 0 ? <p>Sin documentos visibles.</p> : (row.documents || []).slice(0, 5).map((doc) => (
                  <a key={doc.id} href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name}</a>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
