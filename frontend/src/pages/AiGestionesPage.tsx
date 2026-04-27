import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "../api";
import type { RecordItem } from "../types-records";

type AiSuggestion = {
  id: string;
  priority: "Alta" | "Media" | "Baja";
  title: string;
  reason: string;
  action: string;
  record: RecordItem;
};

function n(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysSince(value?: string | null) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function analyze(row: RecordItem): AiSuggestion[] {
  const suggestions: AiSuggestion[] = [];
  const idBase = row.id;
  const amount = n(row.monto_devolucion);
  const status = String(row.estado_gestion || "").toLowerCase();
  const docs = row.documents || [];
  const hasPaymentDoc = docs.some((doc) => /comprobante|detalle|pago/i.test(`${doc.category} ${doc.file_name}`));
  const hasCarta = docs.some((doc) => /carta/i.test(`${doc.category} ${doc.file_name}`));
  const missingPower = row.confirmacion_poder === false || row.confirmacion_poder === null || row.confirmacion_poder === undefined;
  const missingCc = row.confirmacion_cc === false || row.confirmacion_cc === null || row.confirmacion_cc === undefined;

  if (amount >= 500000 && !/pagad|cerrad|facturad/.test(status)) {
    suggestions.push({ id: `${idBase}-high`, priority: "Alta", title: "Priorizar gestión de alto monto", reason: `Monto de devolución sobre $500.000 (${amount.toLocaleString("es-CL")}).`, action: "Revisar estado, confirmar documentos y mover a envío AFP o seguimiento.", record: row });
  }
  if (missingPower) {
    suggestions.push({ id: `${idBase}-power`, priority: "Alta", title: "Falta confirmación de poder", reason: "La gestión puede quedar bloqueada si no existe poder vigente.", action: "Solicitar o validar poder antes de enviar a entidad.", record: row });
  }
  if (missingCc) {
    suggestions.push({ id: `${idBase}-cc`, priority: "Media", title: "Falta confirmación de cuenta corriente", reason: "Sin confirmación bancaria puede retrasarse el pago o depósito.", action: "Validar banco, tipo y número de cuenta con el mandante.", record: row });
  }
  if (!hasCarta && /pendiente|preparación|preparacion/i.test(status)) {
    suggestions.push({ id: `${idBase}-carta`, priority: "Media", title: "Falta carta explicativa", reason: "No se detectó documento tipo carta explicativa en la gestión.", action: "Cargar carta antes de preparar correo a la entidad.", record: row });
  }
  if (/pagad|pago/.test(status) && !hasPaymentDoc) {
    suggestions.push({ id: `${idBase}-payment`, priority: "Alta", title: "Pago sin comprobante visible", reason: "La gestión figura con pago, pero no tiene comprobante/detalle cargado.", action: "Cargar comprobante y detalle de pago para notificar al cliente.", record: row });
  }
  if (/enviad|ingreso/.test(status) && daysSince(row.fecha_presentacion_afp || row.updated_at || row.created_at) > 20) {
    suggestions.push({ id: `${idBase}-follow`, priority: "Media", title: "Seguimiento pendiente por antigüedad", reason: "La gestión lleva más de 20 días desde presentación/actualización.", action: "Enviar correo de seguimiento a la entidad o revisar portal.", record: row });
  }
  if (/rechaz/.test(status)) {
    suggestions.push({ id: `${idBase}-reject`, priority: "Media", title: "Revisar causa de rechazo", reason: row.motivo_rechazo || "No se registró motivo de rechazo.", action: "Completar motivo, adjuntar respaldo y evaluar reproceso.", record: row });
  }

  return suggestions;
}

export default function AiGestionesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState("Todas");

  async function load() {
    setLoading(true);
    try { setRows(await fetchJson<RecordItem[]>("/records")); }
    catch (error) { console.error(error); alert("No se pudo cargar IA para gestiones."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const suggestions = useMemo(() => rows.flatMap(analyze).filter((item) => priority === "Todas" || item.priority === priority), [rows, priority]);
  const counts = {
    Alta: suggestions.filter((item) => item.priority === "Alta").length,
    Media: suggestions.filter((item) => item.priority === "Media").length,
    Baja: suggestions.filter((item) => item.priority === "Baja").length,
  };

  return (
    <div className="zoho-module-page ai-page">
      <div className="zoho-module-header">
        <div>
          <h1>IA para gestiones</h1>
          <p>Motor de reglas inteligentes para priorizar, detectar bloqueos y sugerir próximas acciones.</p>
        </div>
        <div className="zoho-module-actions">
          <select className="zoho-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option>Todas</option><option>Alta</option><option>Media</option><option>Baja</option>
          </select>
          <button className="zoho-btn" onClick={load}>Reanalizar</button>
        </div>
      </div>

      <section className="dashboard-kpi-grid">
        <div className="dashboard-kpi danger"><span>Prioridad alta</span><strong>{counts.Alta}</strong><small>Bloqueos o alto impacto</small></div>
        <div className="dashboard-kpi warning"><span>Prioridad media</span><strong>{counts.Media}</strong><small>Seguimientos y datos faltantes</small></div>
        <div className="dashboard-kpi"><span>Gestiones analizadas</span><strong>{rows.length}</strong><small>Registros disponibles</small></div>
      </section>

      {loading ? <div className="zoho-empty">Analizando gestiones...</div> : (
        <div className="ai-suggestion-list">
          {suggestions.length === 0 ? <div className="zoho-empty">No hay alertas para el filtro seleccionado.</div> : suggestions.map((item) => (
            <article className={`ai-card priority-${item.priority.toLowerCase()}`} key={item.id}>
              <div className="ai-card-top">
                <span className="priority-badge">{item.priority}</span>
                <button className="zoho-btn" onClick={() => navigate(`/records/${item.record.id}`)}>Abrir gestión</button>
              </div>
              <h2>{item.title}</h2>
              <p><strong>{item.record.razon_social || item.record.company?.razon_social || "Sin empresa"}</strong> · {item.record.rut || item.record.company?.rut || "Sin RUT"} · {item.record.entidad || item.record.lineAfp?.afp_name || "Sin AFP"}</p>
              <div className="ai-reason"><strong>Motivo:</strong> {item.reason}</div>
              <div className="ai-action"><strong>Acción sugerida:</strong> {item.action}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
