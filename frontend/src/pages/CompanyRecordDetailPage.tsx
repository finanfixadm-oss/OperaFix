import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchJson, postJson, publicBaseUrl, uploadForm } from "../api";
import ZohoModal from "../components/ZohoModal";

type DocumentItem = {
  id: string;
  category?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  created_at?: string | null;
};

type ActivityItem = {
  id: string;
  activity_type?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type NoteItem = {
  id: string;
  content?: string | null;
  created_at?: string | null;
};

type RecordDetail = Record<string, any> & {
  id: string;
  mandante?: { id: string; name: string } | null;
  group?: { id: string; name: string } | null;
  company?: { id: string; razon_social?: string | null; rut?: string | null } | null;
  lineAfp?: { id: string; afp_name?: string | null } | null;
  documents?: DocumentItem[];
  activities?: ActivityItem[];
  notes?: NoteItem[];
};

const documentCategories = [
  "Poder",
  "Carta explicativa",
  "Archivo AFP",
  "Detalle de pago",
  "Comprobante pago",
  "Comprobante rechazo",
  "Archivo respuesta CEN",
  "Factura",
  "OC",
];

const tabLabels = ["Notas", "Correos", "Cronología", "Archivos adjuntos"];

const sectionDefinitions = [
  {
    title: "DATOS EMPRESA",
    fields: [
      { key: "mandante.name", label: "Mandante", readonly: true },
      { key: "estado_contrato_cliente", label: "Estado contrato con cliente", type: "select", options: ["Vigente", "No vigente", "Pendiente"] },
      { key: "fecha_termino_contrato", label: "Fecha término de contrato", type: "date" },
      { key: "grupo_empresa", label: "Buscar Grupo" },
      { key: "razon_social", label: "Razón Social" },
      { key: "rut", label: "RUT" },
      { key: "direccion", label: "Dirección" },
      { key: "comment", label: "Comentario", type: "textarea" },
      { key: "poder", label: "Poder" },
    ],
  },
  {
    title: "DATOS BANCARIOS",
    fields: [
      { key: "banco", label: "Banco" },
      { key: "tipo_cuenta", label: "Tipo de Cuenta" },
      { key: "numero_cuenta", label: "Número cuenta" },
    ],
  },
  {
    title: "ANTECEDENTES RECHAZO",
    fields: [
      { key: "fecha_rechazo", label: "Fecha Rechazo", type: "date" },
      { key: "doc:Comprobante rechazo", label: "Comprobante rechazo", readonly: true },
      { key: "motivo_rechazo", label: "Motivo del rechazo/anulación", type: "textarea" },
    ],
  },
  {
    title: "INFORMACIÓN DE GESTIÓN",
    fields: [
      { key: "mes_produccion_2026", label: "Mes de producción 2026" },
      { key: "motivo_tipo_exceso", label: "Motivo (Tipo de exceso)", type: "select", options: ["LM", "TP", "LM + TP", "Otro"] },
      { key: "confirmacion_poder", label: "Confirmación Poder", type: "boolean" },
      { key: "estado_gestion", label: "Estado Gestión", type: "select", options: ["Pendiente Gestión", "En preparación", "Enviada AFP", "Respondida AFP", "Pagada", "Facturada", "Cerrada", "Rechazada"] },
      { key: "consulta_cen", label: "Consulta CEN", type: "select", options: ["Sí", "No", "Pendiente"] },
      { key: "envio_afp", label: "Envío AFP", type: "select", options: ["Pendiente", "Enviado", "Respondido", "Rechazado"] },
      { key: "confirmacion_cc", label: "Confirmación CC", type: "boolean" },
      { key: "fecha_presentacion_afp", label: "Fecha Presentación AFP", type: "date" },
      { key: "respuesta_cen", label: "Respuesta CEN", type: "select", options: ["Sí", "No", "Pendiente"] },
      { key: "numero_solicitud", label: "N° Solicitud" },
      { key: "entidad", label: "Entidad (AFP)" },
      { key: "acceso_portal", label: "Acceso portal", type: "select", options: ["Sí", "No", "Pendiente"] },
      { key: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date" },
      { key: "estado_trabajador", label: "Estado Trabajador", type: "select", options: ["Vigente", "No vigente", "Sin información"] },
      { key: "contenido_cen", label: "Contenido CEN", type: "select", options: ["Sí", "No", "Pendiente"] },
    ],
  },
  {
    title: "ARCHIVOS / RESPALDO",
    fields: [
      { key: "doc:Carta explicativa", label: "Carta explicativa", readonly: true },
      { key: "doc:Archivo AFP", label: "Archivo AFP", readonly: true },
      { key: "doc:Detalle de pago", label: "Detalle de pago", readonly: true },
      { key: "doc:Comprobante pago", label: "Comprobante pago", readonly: true },
      { key: "doc:Archivo respuesta CEN", label: "Archivo respuesta CEN", readonly: true },
    ],
  },
  {
    title: "MONTOS RECUPERACIÓN",
    fields: [
      { key: "monto_devolucion", label: "Monto Devolución", type: "money" },
      { key: "monto_cliente", label: "Monto cliente", type: "money" },
      { key: "monto_finanfix_solutions", label: "Monto Finanfix", type: "money" },
      { key: "monto_pagado", label: "Monto Real Pagado", type: "money" },
      { key: "monto_real_cliente", label: "Monto real cliente", type: "money" },
      { key: "fee", label: "FEE", type: "number" },
      { key: "monto_real_finanfix_solutions", label: "Monto real Finanfix Solutions", type: "money" },
    ],
  },
  {
    title: "DATOS FACTURACIÓN",
    fields: [
      { key: "facturado_finanfix", label: "Facturado Finanfix", type: "select", options: ["Sí", "No", "Pendiente"] },
      { key: "facturado_cliente", label: "Facturado cliente", type: "select", options: ["Sí", "No", "Pendiente"] },
      { key: "fecha_pago_afp", label: "Fecha Pago AFP", type: "date" },
      { key: "fecha_factura_finanfix", label: "Fecha Factura Finanfix", type: "date" },
      { key: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date" },
      { key: "fecha_notificacion_cliente", label: "Fecha notificación cliente", type: "date" },
      { key: "numero_factura", label: "N° Factura" },
      { key: "numero_oc", label: "N° OC" },
      { key: "doc:Factura", label: "Factura", readonly: true },
      { key: "doc:OC", label: "OC", readonly: true },
    ],
  },
];

function getValue(row: RecordDetail | null, key: string): any {
  if (!row) return "";
  if (key.startsWith("doc:")) return getDocument(row, key.replace("doc:", ""));
  return key.split(".").reduce<any>((acc, part) => acc?.[part], row);
}

function formatCategory(category?: string | null) {
  return String(category || "").replace(/_/g, " ").toLowerCase();
}

function getDocument(row: RecordDetail, label: string) {
  const normalized = label.toLowerCase();
  return row.documents?.find((doc) => formatCategory(doc.category).includes(normalized.split(" ")[0])) || null;
}

function formatDateForInput(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-CL");
}

function formatMoney(value: unknown) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number.isFinite(num) ? num : 0);
}

function displayValue(row: RecordDetail | null, field: any) {
  const value = getValue(row, field.key);
  if (field.key.startsWith("doc:")) {
    if (!value) return "—";
    return value.file_name || "Ver archivo";
  }
  if (field.type === "date") return formatDate(value);
  if (field.type === "money") return formatMoney(value);
  if (field.type === "boolean") return value ? "Sí" : "No";
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export default function CompanyRecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RecordDetail | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [tab, setTab] = useState("Notas");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [mailOpen, setMailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(documentCategories[0]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  async function load() {
    const row = await fetchJson<RecordDetail>(`/records/${id}`);
    setData(row);
    setDraft(row);
  }

  useEffect(() => {
    if (id) load().catch(() => alert("No se pudo cargar la ficha del registro."));
  }, [id]);

  async function saveDraft(nextDraft = draft) {
    if (!data) return;
    setSaving(true);
    try {
      const row = await fetchJson<RecordDetail>(`/records/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(nextDraft),
      });
      setData(row);
      setDraft(row);
      setEditingKey(null);
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el cambio.");
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!note.trim() || !data) return;
    await postJson(`/records/${data.id}/notes`, { content: note });
    setNote("");
    await load();
  }

  async function uploadDocument() {
    if (!data || !uploadFile) {
      alert("Debes seleccionar un archivo.");
      return;
    }
    const form = new FormData();
    form.append("category", uploadCategory);
    form.append("file", uploadFile);
    await uploadForm(`/records/${data.id}/documents/upload`, form);
    setUploadOpen(false);
    setUploadFile(null);
    await load();
  }

  const notes = data?.notes || [];
  const activities = data?.activities || [];
  const documents = data?.documents || [];
  const title = data?.razon_social || data?.company?.razon_social || "Registro de empresa";
  const motivo = data?.motivo_tipo_exceso || data?.management_type || "—";

  const allVisibleFields = useMemo(() => sectionDefinitions.flatMap((s) => s.fields).filter((f) => !f.key.includes("." ) && !f.key.startsWith("doc:")), []);

  if (!data) return <div className="zoho-empty">Cargando ficha...</div>;

  return (
    <div className="record-detail-page">
      <div className="record-top-card">
        <button className="zoho-btn" onClick={() => navigate("/records")}>←</button>
        <div className="record-brand-box">finan<span>fix</span><small>Solutions SpA</small></div>
        <div className="record-actions">
          <button className="zoho-btn zoho-btn-primary" onClick={() => setMailOpen(true)}>Enviar correo electrónico</button>
          <button className="zoho-btn" disabled={saving} onClick={() => saveDraft()}>{saving ? "Guardando..." : "Editar / Guardar"}</button>
          <button className="zoho-btn">...</button>
          <button className="zoho-btn">‹</button>
          <button className="zoho-btn">›</button>
        </div>
        <div className="record-head-info">
          <div><span>Razón Social</span><strong>{title}</strong></div>
          <div><span>Motivo (Tipo de exceso)</span><strong>{motivo}</strong></div>
        </div>
      </div>

      <div className="record-tabs-card">
        <div className="record-tabs">
          {tabLabels.map((label) => (
            <button key={label} className={tab === label ? "active" : ""} onClick={() => setTab(label)}>{label}</button>
          ))}
        </div>
        <div className="record-tab-content">
          {tab === "Notas" && (
            <>
              <div className="note-input-row">
                <textarea className="note-textarea" placeholder="Agregar una nota" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="zoho-btn zoho-btn-primary" onClick={addNote}>Guardar nota</button>
              </div>
              <div className="notes-list">
                {notes.length === 0 ? <div className="empty-inline">Sin notas.</div> : notes.map((n) => <div className="note-card" key={n.id}><div>{n.content}</div><div className="note-date">{formatDate(n.created_at)}</div></div>)}
              </div>
            </>
          )}
          {tab === "Correos" && <div className="mail-folders"><div>Enviados</div><div>Programados</div><div>Borradores</div></div>}
          {tab === "Cronología" && <div className="timeline-list">{activities.length === 0 ? <div className="empty-inline">Sin actividad.</div> : activities.map((a) => <div className="timeline-item" key={a.id}><span className="timeline-dot" /><div><div className="timeline-type">{a.activity_type}</div><div>{a.description}</div><div className="timeline-date">{formatDate(a.created_at)}</div></div></div>)}</div>}
          {tab === "Archivos adjuntos" && <DocumentsList documents={documents} openUpload={(cat) => { setUploadCategory(cat); setUploadOpen(true); }} />}
        </div>
      </div>

      <div className="record-sections-grid">
        {sectionDefinitions.map((section) => (
          <section className="record-section-card" key={section.title}>
            <div className="record-section-title">{section.title}</div>
            <div className="record-fields-grid">
              {section.fields.map((field) => (
                <EditableInfo
                  key={field.key}
                  field={field}
                  data={data}
                  draft={draft}
                  setDraft={setDraft}
                  editingKey={editingKey}
                  setEditingKey={setEditingKey}
                  saveDraft={saveDraft}
                  openUpload={(cat:string) => { setUploadCategory(cat); setUploadOpen(true); }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <ZohoModal title="Enviar correo electrónico" isOpen={mailOpen} onClose={() => setMailOpen(false)}>
        <div className="zoho-form-grid">
          <div className="zoho-form-field"><label>Para</label><input className="zoho-input" placeholder="correo@cliente.cl" /></div>
          <div className="zoho-form-field"><label>Asunto</label><input className="zoho-input" defaultValue={`Registro ${title}`} /></div>
          <div className="zoho-form-field form-full"><label>Mensaje</label><textarea className="zoho-input zoho-textarea" defaultValue={`Estimados, junto con saludar, enviamos información asociada al registro ${title}.`} /></div>
        </div>
        <div className="zoho-form-actions"><button className="zoho-btn" onClick={() => setMailOpen(false)}>Cerrar</button><button className="zoho-btn zoho-btn-primary" onClick={() => setMailOpen(false)}>Guardar borrador</button></div>
      </ZohoModal>

      <ZohoModal title="Adjuntar documento" isOpen={uploadOpen} onClose={() => setUploadOpen(false)}>
        <div className="zoho-form-grid">
          <div className="zoho-form-field"><label>Tipo documento</label><select className="zoho-select" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>{documentCategories.map((cat) => <option key={cat}>{cat}</option>)}</select></div>
          <div className="zoho-form-field"><label>Archivo</label><input className="zoho-input" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} /></div>
        </div>
        <div className="zoho-form-actions"><button className="zoho-btn" onClick={() => setUploadOpen(false)}>Cancelar</button><button className="zoho-btn zoho-btn-primary" onClick={uploadDocument}>Subir documento</button></div>
      </ZohoModal>
    </div>
  );
}

function EditableInfo({ field, data, draft, setDraft, editingKey, setEditingKey, saveDraft, openUpload }: any) {
  const isDoc = field.key.startsWith("doc:");
  const isEditing = editingKey === field.key;
  const fieldValue = draft[field.key] ?? getValue(data, field.key) ?? "";
  const doc = isDoc ? getValue(data, field.key) : null;

  if (isDoc) {
    return (
      <div className="record-info-field">
        <span>{field.label}</span>
        {doc ? <a href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name}</a> : <strong>—</strong>}
        <button className="inline-edit-btn" onClick={() => openUpload(field.label)}>Adjuntar</button>
      </div>
    );
  }

  return (
    <div className="record-info-field">
      <span>{field.label}</span>
      {isEditing && !field.readonly ? (
        <div className="inline-edit-row">
          {field.type === "select" ? (
            <select className="zoho-select" value={fieldValue || ""} onChange={(e) => setDraft((p: any) => ({ ...p, [field.key]: e.target.value }))}>{["", ...(field.options || [])].map((opt: string) => <option key={opt} value={opt}>{opt || "Seleccionar"}</option>)}</select>
          ) : field.type === "boolean" ? (
            <select className="zoho-select" value={String(Boolean(fieldValue))} onChange={(e) => setDraft((p: any) => ({ ...p, [field.key]: e.target.value === "true" }))}><option value="false">No</option><option value="true">Sí</option></select>
          ) : field.type === "date" ? (
            <input className="zoho-input" type="date" value={formatDateForInput(fieldValue)} onChange={(e) => setDraft((p: any) => ({ ...p, [field.key]: e.target.value }))} />
          ) : field.type === "textarea" ? (
            <textarea className="zoho-input" value={fieldValue || ""} onChange={(e) => setDraft((p: any) => ({ ...p, [field.key]: e.target.value }))} />
          ) : (
            <input className="zoho-input" type={field.type === "money" || field.type === "number" ? "number" : "text"} value={fieldValue || ""} onChange={(e) => setDraft((p: any) => ({ ...p, [field.key]: e.target.value }))} />
          )}
          <button className="inline-save-btn" onClick={() => saveDraft()}>✓</button>
        </div>
      ) : (
        <strong>{displayValue(data, field)}</strong>
      )}
      {!field.readonly && <button className="inline-edit-btn" onClick={() => setEditingKey(field.key)}>✎</button>}
    </div>
  );
}

function DocumentsList({ documents, openUpload }: { documents: DocumentItem[]; openUpload: (cat: string) => void }) {
  return (
    <div className="documents-stage-grid">
      {documentCategories.map((cat) => {
        const docs = documents.filter((d) => formatCategory(d.category).includes(cat.toLowerCase().split(" ")[0]));
        return (
          <div className="document-stage-box" key={cat}>
            <div className="document-stage-title"><strong>{cat}</strong><button className="inline-edit-btn" onClick={() => openUpload(cat)}>Adjuntar</button></div>
            {docs.length === 0 ? <span className="empty-inline">Sin archivo</span> : docs.map((doc) => <a key={doc.id} href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name}</a>)}
          </div>
        );
      })}
    </div>
  );
}
