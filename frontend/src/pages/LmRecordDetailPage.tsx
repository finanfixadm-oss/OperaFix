import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchJson, postJson, publicBaseUrl } from "../api";
import type { LmRecordDetailResponse } from "../types";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const formatCurrency = (value?: string | number | null) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));
const boolText = (value?: boolean | null) => value === true ? "Sí" : value === false ? "No" : "—";

export default function LmRecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<LmRecordDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "timeline">("overview");
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchJson<LmRecordDetailResponse>(`/lm-records/${id}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  const timeline = useMemo(() => {
    const notes = (detail?.notes || []).map((note) => ({ id: `n-${note.id}`, type: 'Nota', text: note.content, date: note.created_at }));
    const activities = (detail?.activities || []).map((activity) => ({ id: `a-${activity.id}`, type: activity.activity_type, text: activity.description, date: activity.created_at }));
    return [...notes, ...activities].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [detail]);

  async function addNote() {
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      await postJson(`/lm-records/${id}/notes`, { content: noteInput.trim() });
      const fresh = await fetchJson<LmRecordDetailResponse>(`/lm-records/${id}`);
      setDetail(fresh);
      setNoteInput("");
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) return <div className="inline-message">Cargando detalle LM...</div>;
  if (!detail?.record) return <div className="inline-message">Registro no encontrado.</div>;

  const record = detail.record;

  return (
    <div className="lm-detail-page">
      <div className="lm-detail-header">
        <div className="lm-detail-header-left">
          <button className="icon-back-btn" onClick={() => navigate(-1)}>←</button>
          <div className="lm-avatar">{(record.business_name || record.search_group || 'L').slice(0, 1).toUpperCase()}</div>
          <div>
            <h1 className="lm-detail-title">{record.business_name || record.search_group || 'Registro LM'}</h1>
            <div className="lm-detail-subtitle"><span>{record.rut}</span><span>•</span><span>{record.entity || 'Sin entidad'}</span><span>•</span><span>{record.management_status || 'Sin estado'}</span></div>
          </div>
        </div>
        <div className="lm-detail-header-actions"><button className="ghost-btn">Enviar correo electrónico</button><button className="ghost-btn">Editar</button><button className="ghost-btn">•••</button></div>
      </div>

      <div className="lm-detail-body">
        <aside className="lm-related-sidebar">
          <div className="lm-related-block">
            <div className="lm-related-title">Lista relacionada</div>
            <button className="lm-related-link">Notas</button>
            <button className="lm-related-link">Registros conectados</button>
            <button className="lm-related-link">Archivos adjuntos</button>
            <button className="lm-related-link">Correos electrónicos</button>
            <button className="lm-related-link">Actividades abiertas</button>
            <button className="lm-related-link">Actividades cerradas</button>
            <button className="lm-related-link">Empresas del grupo</button>
          </div>
        </aside>

        <main className="lm-detail-main">
          <div className="lm-tab-row"><button className={`lm-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Visión general</button><button className={`lm-tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>Cronología</button></div>
          {tab === 'overview' ? (
            <>
              <section className="zoho-card"><div className="zoho-card-grid two-cols"><InfoPair label="Mandante" value={record.mandante} /><InfoPair label="Grupo búsqueda" value={record.search_group} /><InfoPair label="Modificado por" value="Luis Mendoza" /><InfoPair label="Hora de modificación" value={formatDate(record.updated_at)} /></div></section>
              <section className="zoho-card"><div className="zoho-card-header"><h3>Información de gestión LM</h3></div><div className="zoho-card-grid three-cols"><InfoPair label="Razón social" value={record.business_name} /><InfoPair label="RUT" value={record.rut} /><InfoPair label="Entidad" value={record.entity} /><InfoPair label="Estado Gestión" value={record.management_status} /><InfoPair label="Motivo" value={record.excess_type_reason} /><InfoPair label="Estado Trabajador" value={record.worker_status} /><InfoPair label="N° Solicitud" value={record.request_number} /><InfoPair label="Acceso portal" value={record.portal_access} /><InfoPair label="Confirmación CC" value={boolText(record.confirmation_cc)} /><InfoPair label="Confirmación Poder" value={boolText(record.confirmation_power)} /><InfoPair label="Monto devolución" value={formatCurrency(record.refund_amount)} /><InfoPair label="Monto real pagado" value={formatCurrency(record.actual_paid_amount)} /><InfoPair label="Banco" value={record.bank_name} /><InfoPair label="Número cuenta" value={record.account_number} /><InfoPair label="Tipo de cuenta" value={record.account_type} /></div><div className="lm-comment-box"><div className="field-label">Comentario</div><div className="field-value multiline">{record.comment || '—'}</div></div></section>
              <section className="zoho-card"><div className="section-row"><h3>Notas</h3></div><div className="note-input-row"><textarea className="note-textarea" placeholder="Agregar una nota" value={noteInput} onChange={(e)=>setNoteInput(e.target.value)} /><button className="primary-btn" onClick={addNote} disabled={savingNote}>{savingNote ? 'Guardando...' : 'Agregar nota'}</button></div><div className="notes-list">{detail.notes.length===0?<div className="empty-state">No se encontraron notas.</div>:detail.notes.map((note)=><div className="note-card" key={note.id}><div className="note-content">{note.content}</div><div className="note-date">{formatDate(note.created_at)}</div></div>)}</div></section>
              <section className="zoho-card"><div className="section-row"><h3>Archivos adjuntos</h3><button className="ghost-btn">Adjuntar</button></div>{detail.documents.length===0?<div className="empty-state">Sin archivo adjunto.</div>:<div className="attachment-list">{detail.documents.map((doc)=><a className="document-row" key={doc.id} href={`${publicBaseUrl}${doc.storage_path}`} target="_blank" rel="noreferrer"><div><strong>{doc.title || doc.original_filename}</strong><span>{doc.original_filename}</span></div><strong>{formatDate(doc.created_at)}</strong></a>)}</div>}</section>
              <section className="zoho-card"><div className="section-row"><h3>Actividades abiertas</h3></div>{detail.activities.length===0?<div className="empty-state">No se encontraron registros.</div>:<div className="activity-list">{detail.activities.map((a)=><div className="activity-card" key={a.id}><div className="activity-type">{a.activity_type}</div><div className="activity-description">{a.description}</div><div className="activity-date">{formatDate(a.created_at)}</div></div>)}</div>}</section>
            </>
          ) : (
            <section className="zoho-card"><div className="zoho-card-header"><h3>Cronología</h3></div><div className="timeline-list">{timeline.length===0?<div className="empty-state">No hay actividad aún.</div>:timeline.map((event)=><div className="timeline-item" key={event.id}><div className="timeline-dot" /><div className="timeline-content"><div className="timeline-type">{event.type}</div><div className="timeline-text">{event.text}</div><div className="timeline-date">{formatDate(event.date)}</div></div></div>)}</div></section>
          )}
        </main>
      </div>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="info-pair"><div className="field-label">{label}</div><div className="field-value">{value || '—'}</div></div>;
}
