import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "../api";
import type { RecordItem } from "../types-records";

type Priority = "Alta" | "Media" | "Baja";

type AiSuggestion = {
  id: string;
  priority: Priority;
  title: string;
  reason: string;
  action: string;
  template?: string;
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

function money(value: unknown) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n(value));
}

function recordName(row: RecordItem) {
  return row.razon_social || row.company?.razon_social || "Sin empresa";
}

function analyze(row: RecordItem): AiSuggestion[] {
  const suggestions: AiSuggestion[] = [];
  const idBase = row.id;
  const amount = n(row.monto_devolucion);
  const status = String(row.estado_gestion || "").toLowerCase();
  const docs = row.documents || [];
  const hasPaymentDoc = docs.some((doc) => /comprobante|detalle|pago/i.test(`${doc.category} ${doc.file_name}`));
  const hasCarta = docs.some((doc) => /carta/i.test(`${doc.category} ${doc.file_name}`));
  const hasAfpFile = docs.some((doc) => /afp|informe|archivo/i.test(`${doc.category} ${doc.file_name}`));
  const missingPower = row.confirmacion_poder === false || row.confirmacion_poder === null || row.confirmacion_poder === undefined;
  const missingCc = row.confirmacion_cc === false || row.confirmacion_cc === null || row.confirmacion_cc === undefined;
  const age = daysSince(row.fecha_presentacion_afp || row.updated_at || row.created_at);

  if (amount >= 500000 && !/pagad|cerrad|facturad/.test(status)) {
    suggestions.push({ id: `${idBase}-high`, priority: "Alta", title: "Priorizar gestión de alto monto", reason: `Monto de devolución ${money(amount)}.`, action: "Revisar documentos, confirmar poder/cuenta y priorizar envío o seguimiento con entidad.", template: "Prioridad por monto alto", record: row });
  }
  if (missingPower) {
    suggestions.push({ id: `${idBase}-power`, priority: "Alta", title: "Falta confirmación de poder", reason: "La gestión puede quedar bloqueada si no existe poder vigente.", action: "Solicitar poder al mandante o validar respaldo antes de enviar a entidad.", template: "Solicitud de poder", record: row });
  }
  if (missingCc) {
    suggestions.push({ id: `${idBase}-cc`, priority: "Media", title: "Falta confirmación de cuenta corriente", reason: "Sin confirmación bancaria puede retrasarse el pago o depósito.", action: "Validar banco, tipo y número de cuenta con el mandante.", template: "Validación cuenta corriente", record: row });
  }
  if (!hasCarta && /pendiente|preparación|preparacion|borrador/i.test(status)) {
    suggestions.push({ id: `${idBase}-carta`, priority: "Media", title: "Falta carta explicativa", reason: "No se detectó documento tipo carta explicativa en la gestión.", action: "Cargar carta explicativa antes de preparar correo a la entidad.", template: "Carga documental", record: row });
  }
  if (!hasAfpFile && /ingreso|enviad|present/i.test(status)) {
    suggestions.push({ id: `${idBase}-afp-file`, priority: "Media", title: "Revisar archivo AFP", reason: "La gestión parece enviada o presentada, pero no se detectó archivo AFP/informe asociado.", action: "Cargar informe AFP o respaldo de envío para trazabilidad.", template: "Regularización documental", record: row });
  }
  if (/pagad|pago/.test(status) && !hasPaymentDoc) {
    suggestions.push({ id: `${idBase}-payment`, priority: "Alta", title: "Pago sin comprobante visible", reason: "La gestión figura con pago, pero no tiene comprobante/detalle cargado.", action: "Cargar comprobante y detalle de pago para notificar al cliente.", template: "Envío comprobante y detalle", record: row });
  }
  if (/enviad|ingreso|present/.test(status) && age > 20) {
    suggestions.push({ id: `${idBase}-follow`, priority: "Media", title: "Seguimiento pendiente por antigüedad", reason: `La gestión lleva ${age} días desde presentación/actualización.`, action: "Enviar correo de seguimiento a la entidad o revisar portal.", template: "Seguimiento entidad", record: row });
  }
  if (/rechaz/.test(status)) {
    suggestions.push({ id: `${idBase}-reject`, priority: "Media", title: "Revisar causa de rechazo", reason: row.motivo_rechazo || "No se registró motivo de rechazo.", action: "Completar motivo, adjuntar respaldo y evaluar reproceso.", template: "Rechazo de gestión", record: row });
  }
  if (amount < 50000 && !/pagad|cerrad|rechaz/.test(status)) {
    suggestions.push({ id: `${idBase}-low`, priority: "Baja", title: "Gestión de bajo monto", reason: `Monto ${money(amount)}.`, action: "Agrupar con otras gestiones del mismo mandante para operación por lote.", template: "Agrupar gestión", record: row });
  }

  return suggestions;
}

function exportSuggestions(filename: string, rows: AiSuggestion[]) {
  const headers = ["Prioridad", "Empresa", "RUT", "AFP", "Estado", "Motivo", "Acción", "Plantilla"];
  const body = rows.map((item) => [
    item.priority,
    recordName(item.record),
    item.record.rut || item.record.company?.rut || "",
    item.record.entidad || item.record.lineAfp?.afp_name || "",
    item.record.estado_gestion || "",
    item.reason,
    item.action,
    item.template || "",
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

function buildWeeklyPlan(items: AiSuggestion[]) {
  const high = items.filter((item) => item.priority === "Alta").slice(0, 8);
  const medium = items.filter((item) => item.priority === "Media").slice(0, 10);
  const lines = [
    "PLAN SEMANAL SUGERIDO - OPERAFIX",
    "",
    "1) Prioridad alta",
    ...high.map((item, index) => `${index + 1}. ${recordName(item.record)} (${item.record.rut || item.record.company?.rut || "Sin RUT"}) - ${item.title}: ${item.action}`),
    "",
    "2) Seguimientos y regularizaciones",
    ...medium.map((item, index) => `${index + 1}. ${recordName(item.record)} - ${item.title}: ${item.action}`),
    "",
    "3) Recomendación operativa",
    "Trabajar primero poderes, comprobantes de pago faltantes y gestiones con más de 20 días sin respuesta.",
  ];
  return lines.join("\n");
}

export default function AiGestionesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState("Todas");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState("");

  async function load() {
    setLoading(true);
    try { setRows(await fetchJson<RecordItem[]>("/records")); }
    catch (error) { console.error(error); alert("No se pudo cargar IA para gestiones."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const allSuggestions = useMemo(() => rows.flatMap(analyze), [rows]);
  const suggestions = useMemo(() => allSuggestions.filter((item) => {
    const matchesPriority = priority === "Todas" || item.priority === priority;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || [recordName(item.record), item.record.rut, item.record.company?.rut, item.record.entidad, item.record.estado_gestion, item.title, item.reason]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    return matchesPriority && matchesSearch;
  }), [allSuggestions, priority, search]);

  const counts = {
    Alta: suggestions.filter((item) => item.priority === "Alta").length,
    Media: suggestions.filter((item) => item.priority === "Media").length,
    Baja: suggestions.filter((item) => item.priority === "Baja").length,
  };

  async function copyAction(item: AiSuggestion) {
    const text = `${item.title}\nEmpresa: ${recordName(item.record)}\nRUT: ${item.record.rut || item.record.company?.rut || "Sin RUT"}\nMotivo: ${item.reason}\nAcción sugerida: ${item.action}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1400);
  }

  return (
    <div className="zoho-module-page ai-page">
      <div className="zoho-module-header">
        <div>
          <h1>IA para gestiones</h1>
          <p>Motor de reglas inteligentes para priorizar, detectar bloqueos, sugerir correos y generar plan semanal.</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn" onClick={() => exportSuggestions("ia_gestiones_operafix.csv", suggestions)}>Exportar alertas</button>
          <button className="zoho-btn" onClick={() => setWeeklyPlan(buildWeeklyPlan(suggestions))}>Generar plan semanal</button>
          <button className="zoho-btn" onClick={load}>Reanalizar</button>
        </div>
      </div>

      <section className="dashboard-filter-card">
        <select className="zoho-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>Todas</option><option>Alta</option><option>Media</option><option>Baja</option>
        </select>
        <input className="zoho-input" placeholder="Buscar empresa, RUT, AFP, estado o alerta..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </section>

      <section className="dashboard-kpi-grid">
        <div className="dashboard-kpi danger"><span>Prioridad alta</span><strong>{counts.Alta}</strong><small>Bloqueos o alto impacto</small></div>
        <div className="dashboard-kpi warning"><span>Prioridad media</span><strong>{counts.Media}</strong><small>Seguimientos y datos faltantes</small></div>
        <div className="dashboard-kpi"><span>Prioridad baja</span><strong>{counts.Baja}</strong><small>Agrupables o bajo riesgo</small></div>
        <div className="dashboard-kpi"><span>Gestiones analizadas</span><strong>{rows.length}</strong><small>Registros disponibles</small></div>
      </section>

      {weeklyPlan && (
        <section className="zoho-card ai-plan-card">
          <div className="zoho-card-title-row"><h2>Plan semanal sugerido</h2><button className="zoho-btn" onClick={() => navigator.clipboard.writeText(weeklyPlan)}>Copiar plan</button></div>
          <pre>{weeklyPlan}</pre>
        </section>
      )}

      {loading ? <div className="zoho-empty">Analizando gestiones...</div> : (
        <div className="ai-suggestion-list">
          {suggestions.length === 0 ? <div className="zoho-empty">No hay alertas para el filtro seleccionado.</div> : suggestions.map((item) => (
            <article className={`ai-card priority-${item.priority.toLowerCase()}`} key={item.id}>
              <div className="ai-card-top">
                <span className="priority-badge">{item.priority}</span>
                <div className="ai-card-actions">
                  <button className="zoho-btn" onClick={() => copyAction(item)}>{copiedId === item.id ? "Copiado" : "Copiar acción"}</button>
                  <button className="zoho-btn" onClick={() => navigate(`/records/${item.record.id}`)}>Abrir gestión</button>
                </div>
              </div>
              <h2>{item.title}</h2>
              <p><strong>{recordName(item.record)}</strong> · {item.record.rut || item.record.company?.rut || "Sin RUT"} · {item.record.entidad || item.record.lineAfp?.afp_name || "Sin AFP"} · {money(item.record.monto_devolucion)}</p>
              <div className="ai-reason"><strong>Motivo:</strong> {item.reason}</div>
              <div className="ai-action"><strong>Acción sugerida:</strong> {item.action}</div>
              {item.template && <div className="ai-template"><strong>Plantilla sugerida:</strong> {item.template}</div>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
