import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson, publicBaseUrl, putJson, uploadForm } from "../api";

type Doc = { id: string; category?: string | null; file_name?: string | null; file_url?: string | null; created_at?: string | null };
type Activity = { id: string; activity_type?: string | null; description?: string | null; created_at?: string | null };
type Note = { id: string; content?: string | null; created_at?: string | null };

type RecordDetail = {
  id: string;
  management_type?: string | null;
  razon_social?: string | null;
  rut?: string | null;
  direccion?: string | null;
  entidad?: string | null;
  estado_gestion?: string | null;
  estado_contrato_cliente?: string | null;
  fecha_termino_contrato?: string | null;
  grupo_empresa?: string | null;
  comment?: string | null;
  banco?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  fecha_rechazo?: string | null;
  motivo_rechazo?: string | null;
  mes_produccion_2026?: string | null;
  motivo_tipo_exceso?: string | null;
  confirmacion_poder?: boolean | null;
  consulta_cen?: string | null;
  mes_ingreso_solicitud?: string | null;
  envio_afp?: string | null;
  confirmacion_cc?: boolean | null;
  fecha_presentacion_afp?: string | null;
  respuesta_cen?: string | null;
  numero_solicitud?: string | null;
  acceso_portal?: string | null;
  fecha_ingreso_afp?: string | null;
  estado_trabajador?: string | null;
  monto_devolucion?: number | string | null;
  monto_cliente?: number | string | null;
  monto_finanfix_solutions?: number | string | null;
  monto_pagado?: number | string | null;
  monto_real_cliente?: number | string | null;
  fee?: number | string | null;
  monto_real_finanfix_solutions?: number | string | null;
  facturado_finanfix?: string | null;
  facturado_cliente?: string | null;
  fecha_pago_afp?: string | null;
  fecha_factura_finanfix?: string | null;
  fecha_pago_factura_finanfix?: string | null;
  fecha_notificacion_cliente?: string | null;
  numero_factura?: string | null;
  numero_oc?: string | null;
  mandante?: { name?: string | null; nombre?: string | null } | null;
  company?: { razon_social?: string | null; rut?: string | null; direccion?: string | null } | null;
  lineAfp?: { afp_name?: string | null } | null;
  documents?: Doc[];
  notes?: Note[];
  activities?: Activity[];
};

type FieldDef = { label: string; key: keyof RecordDetail; type?: "text" | "date" | "number" | "boolean" | "money" };

const documentTypes = ["Poder", "Carta explicativa", "Archivo AFP", "Detalle de pago", "Comprobante pago", "Comprobante rechazo", "Archivo respuesta CEN", "Factura", "OC"];

function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function money(value?: number | string | null) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function date(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CL");
}

function dateInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function normalizeCategory(category?: string | null) {
  return String(category || "").replace(/_/g, " ").toLowerCase();
}

function displayField(record: RecordDetail, field: FieldDef) {
  const raw = record[field.key];
  if (field.type === "date") return date(raw as string | null);
  if (field.type === "money") return money(raw as any);
  return value(raw);
}

export default function CompanyRecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RecordDetail | null>(null);
  const [tab, setTab] = useState("notas");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Poder");
  const [file, setFile] = useState<File | null>(null);
  const [editField, setEditField] = useState<FieldDef | null>(null);
  const [editValue, setEditValue] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  async function fetchData() {
    const result = await fetchJson<RecordDetail>(`/records/${id}`);
    setData(result);
  }

  useEffect(() => {
    if (id) fetchData().catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!data) return;
    setEmailSubject(`Seguimiento gestión ${data.razon_social || data.company?.razon_social || ""}`.trim());
    setEmailBody(`Estimados,\n\nJunto con saludar, solicitamos apoyo con la gestión ${data.numero_solicitud || ""} correspondiente a ${data.razon_social || data.company?.razon_social || "la empresa"}.\n\nQuedo atento.\n`);
  }, [data?.id]);

  async function saveNote() {
    if (!note.trim()) return;
    await postJson(`/records/${id}/notes`, { content: note });
    setNote("");
    await fetchData();
  }

  async function uploadDocument() {
    if (!file) return alert("Selecciona un archivo.");
    const fd = new FormData();
    fd.append("category", category);
    fd.append("file", file);
    await uploadForm(`/records/${id}/documents/upload`, fd);
    setFile(null);
    await fetchData();
  }

  function openFieldEditor(field: FieldDef) {
    if (!data) return;
    const current = data[field.key] as any;
    setEditField(field);
    setEditValue(field.type === "date" ? dateInputValue(current) : current === null || current === undefined ? "" : String(current));
  }

  async function saveInlineField() {
    if (!editField) return;
    let value: unknown = editValue;
    if (editField.type === "number" || editField.type === "money") value = editValue === "" ? null : Number(editValue);
    if (editField.type === "boolean") value = editValue === "true";
    if (editField.type === "date") value = editValue || null;
    const result = await putJson<RecordDetail>(`/records/${id}`, { [editField.key]: value });
    setData(result);
    setEditField(null);
    setEditValue("");
  }

  function openMail() {
    const url = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = url;
  }

  const documentsByCategory = useMemo(() => {
    const map: Record<string, Doc[]> = {};
    for (const doc of data?.documents || []) {
      const key = normalizeCategory(doc.category);
      if (!map[key]) map[key] = [];
      map[key].push(doc);
    }
    return map;
  }, [data?.documents]);

  if (!data) return <div className="zoho-empty">Cargando ficha...</div>;

  const companyName = data.razon_social || data.company?.razon_social || "Sin razón social";
  const motive = data.motivo_tipo_exceso || data.management_type || "Sin motivo";

  const datosEmpresa: FieldDef[] = [
    { label: "Mandante", key: "mandante" as any },
    { label: "Estado contrato con cliente", key: "estado_contrato_cliente" },
    { label: "Fecha término de contrato", key: "fecha_termino_contrato", type: "date" },
    { label: "Buscar Grupo", key: "grupo_empresa" },
    { label: "Razón Social", key: "razon_social" },
    { label: "RUT", key: "rut" },
    { label: "Dirección", key: "direccion" },
    { label: "Comentario", key: "comment" },
  ];
  const bancarios: FieldDef[] = [
    { label: "Banco", key: "banco" },
    { label: "Tipo de Cuenta", key: "tipo_cuenta" },
    { label: "Número cuenta", key: "numero_cuenta" },
  ];
  const rechazo: FieldDef[] = [
    { label: "Fecha Rechazo", key: "fecha_rechazo", type: "date" },
    { label: "Motivo del rechazo/anulación", key: "motivo_rechazo" },
  ];
  const gestion: FieldDef[] = [
    { label: "Mes de producción 2026", key: "mes_produccion_2026" },
    { label: "Motivo (Tipo de exceso)", key: "motivo_tipo_exceso" },
    { label: "Confirmación Poder", key: "confirmacion_poder", type: "boolean" },
    { label: "Estado Gestión", key: "estado_gestion" },
    { label: "Consulta CEN", key: "consulta_cen" },
    { label: "Mes de ingreso solicitud", key: "mes_ingreso_solicitud" },
    { label: "Envío AFP", key: "envio_afp" },
    { label: "Confirmación CC", key: "confirmacion_cc", type: "boolean" },
    { label: "Fecha Presentación AFP", key: "fecha_presentacion_afp", type: "date" },
    { label: "Respuesta CEN", key: "respuesta_cen" },
    { label: "N° Solicitud", key: "numero_solicitud" },
    { label: "Entidad (AFP)", key: "entidad" },
    { label: "Acceso portal", key: "acceso_portal" },
    { label: "Fecha ingreso AFP", key: "fecha_ingreso_afp", type: "date" },
    { label: "Estado Trabajador", key: "estado_trabajador" },
  ];
  const montos: FieldDef[] = [
    { label: "Monto Devolución", key: "monto_devolucion", type: "money" },
    { label: "Monto cliente", key: "monto_cliente", type: "money" },
    { label: "Monto Finanfix", key: "monto_finanfix_solutions", type: "money" },
    { label: "Monto Real Pagado", key: "monto_pagado", type: "money" },
    { label: "Monto real cliente", key: "monto_real_cliente", type: "money" },
    { label: "FEE", key: "fee", type: "number" },
    { label: "Monto real Finanfix Solutions", key: "monto_real_finanfix_solutions", type: "money" },
  ];
  const facturacion: FieldDef[] = [
    { label: "Facturado Finanfix", key: "facturado_finanfix" },
    { label: "Facturado cliente", key: "facturado_cliente" },
    { label: "Fecha Pago AFP", key: "fecha_pago_afp", type: "date" },
    { label: "Fecha Factura Finanfix", key: "fecha_factura_finanfix", type: "date" },
    { label: "Fecha pago factura Finanfix", key: "fecha_pago_factura_finanfix", type: "date" },
    { label: "Fecha notificación cliente", key: "fecha_notificacion_cliente", type: "date" },
    { label: "N° Factura", key: "numero_factura" },
    { label: "N° OC", key: "numero_oc" },
  ];

  return (
    <div className="zoho-detail-page">
      <div className="zoho-record-header-card fixed-detail-header">
        <button className="zoho-btn" onClick={() => navigate("/records")}>←</button>
        <div className="zoho-logo-box">finanfix<br /><small>Solutions SpA</small></div>
        <div className="zoho-record-actions">
          <button className="zoho-btn zoho-btn-primary" onClick={() => setEmailOpen(true)}>Enviar correo electrónico</button>
          <button className="zoho-btn" onClick={() => alert("Puedes editar campo por campo presionando el lápiz de cada dato.")}>Editar</button>
          <button className="zoho-btn">...</button>
          <button className="zoho-btn">‹</button>
          <button className="zoho-btn">›</button>
        </div>
        <div className="zoho-record-title">
          <span>Razón Social:</span> <strong>{companyName}</strong><br />
          <span>Motivo (Tipo de exceso):</span> <strong>{motive}</strong>
        </div>
      </div>

      <div className="zoho-detail-tabs">
        {[["notas", "NOTAS"], ["correos", "CORREOS"], ["cronologia", "CRONOLOGÍA"], ["archivos", "ARCHIVOS ADJUNTOS"]].map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div className="zoho-tab-content-card">
        {tab === "notas" && <div><h3>Notas</h3><select className="zoho-select zoho-small-select"><option>Recientes Última</option></select><div className="zoho-note-row"><input className="zoho-input" placeholder="Agregar una nota" value={note} onChange={(e) => setNote(e.target.value)} /><button className="zoho-btn zoho-btn-primary" onClick={saveNote}>Guardar</button></div>{(data.notes || []).map((item) => <div className="zoho-timeline-item" key={item.id}>{item.content}</div>)}</div>}
        {tab === "correos" && <div className="zoho-mail-folders"><span>Enviados</span><span>Programados</span><span>Borradores</span><button className="zoho-btn zoho-btn-primary" onClick={() => setEmailOpen(true)}>Nuevo correo</button></div>}
        {tab === "cronologia" && (data.activities || []).map((a) => <div className="zoho-timeline-item" key={a.id}><strong>{a.activity_type || "Actividad"}</strong><br />{a.description}</div>)}
        {tab === "archivos" && (data.documents || []).map((d) => <DocumentLink key={d.id} doc={d} />)}
      </div>

      <div className="zoho-detail-grid-cards">
        <Card title="DATOS EMPRESA">{datosEmpresa.map((f) => f.key === "mandante" ? <div key="mandante" className="zoho-info-line"><span>Mandante</span><strong>{data.mandante?.name || data.mandante?.nombre || "—"}</strong></div> : <InlineInfo key={String(f.key)} field={f} record={data} onEdit={openFieldEditor} />)}<DocSlot label="Poder" docs={documentsByCategory["poder"]} /></Card>
        <Card title="DATOS BANCARIOS">{bancarios.map((f) => <InlineInfo key={String(f.key)} field={f} record={data} onEdit={openFieldEditor} />)}</Card>
        <Card title="ANTECEDENTES RECHAZO">{rechazo.map((f) => <InlineInfo key={String(f.key)} field={f} record={data} onEdit={openFieldEditor} />)}<DocSlot label="Comprobante rechazo" docs={documentsByCategory["comprobante rechazo"]} /></Card>
        <Card title="INFORMACIÓN DE GESTIÓN">{gestion.map((f) => <InlineInfo key={String(f.key)} field={f} record={data} onEdit={openFieldEditor} />)}</Card>
        <Card title="ARCHIVOS / RESPALDO"><DocSlot label="Carta explicativa" docs={documentsByCategory["carta explicativa"]} /><DocSlot label="Archivo AFP" docs={documentsByCategory["archivo afp"]} /><DocSlot label="Detalle de pago" docs={documentsByCategory["detalle trabajadores"] || documentsByCategory["detalle de pago"]} /><DocSlot label="Comprobante pago" docs={documentsByCategory["comprobante pago"]} /><DocSlot label="Archivo respuesta CEN" docs={documentsByCategory["respuesta cen"] || documentsByCategory["archivo respuesta cen"]} /></Card>
        <Card title="MONTOS RECUPERACIÓN">{montos.map((f) => <InlineInfo key={String(f.key)} field={f} record={data} onEdit={openFieldEditor} />)}</Card>
        <Card title="DATOS FACTURACIÓN">{facturacion.map((f) => <InlineInfo key={String(f.key)} field={f} record={data} onEdit={openFieldEditor} />)}<DocSlot label="Factura" docs={documentsByCategory["factura"]} /><DocSlot label="OC" docs={documentsByCategory["orden compra"] || documentsByCategory["oc"]} /></Card>
      </div>

      <div className="zoho-upload-card">
        <h3>Adjuntar documento al registro</h3>
        <select className="zoho-select" value={category} onChange={(e) => setCategory(e.target.value)}>{documentTypes.map((type) => <option key={type}>{type}</option>)}</select>
        <input className="zoho-input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="zoho-btn zoho-btn-primary" onClick={uploadDocument}>Subir documento</button>
      </div>

      <ZohoModal title={editField ? `Editar ${editField.label}` : "Editar campo"} isOpen={!!editField} onClose={() => setEditField(null)}>
        <div className="zoho-form-field">
          <label>{editField?.label}</label>
          {editField?.type === "boolean" ? (
            <select className="zoho-select" value={editValue} onChange={(e) => setEditValue(e.target.value)}><option value="true">Sí</option><option value="false">No</option></select>
          ) : (
            <input className="zoho-input" type={editField?.type === "date" ? "date" : editField?.type === "money" || editField?.type === "number" ? "number" : "text"} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          )}
        </div>
        <div className="zoho-form-actions"><button className="zoho-btn" onClick={() => setEditField(null)}>Cancelar</button><button className="zoho-btn zoho-btn-primary" onClick={saveInlineField}>Guardar cambio</button></div>
      </ZohoModal>

      <ZohoModal title="Enviar correo electrónico" isOpen={emailOpen} onClose={() => setEmailOpen(false)}>
        <div className="zoho-form-grid">
          <Field label="Para"><input className="zoho-input" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="correo@empresa.cl" /></Field>
          <Field label="Asunto"><input className="zoho-input" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} /></Field>
        </div>
        <div className="zoho-form-field"><label>Mensaje</label><textarea className="zoho-input zoho-textarea" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} /></div>
        <div className="zoho-form-actions"><button className="zoho-btn" onClick={() => setEmailOpen(false)}>Cancelar</button><button className="zoho-btn zoho-btn-primary" onClick={openMail}>Abrir correo</button></div>
      </ZohoModal>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="zoho-info-card"><h3>{title}</h3>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="zoho-form-field"><label>{label}</label>{children}</div>; }
function InlineInfo({ field, record, onEdit }: { field: FieldDef; record: RecordDetail; onEdit: (field: FieldDef) => void }) { return <div className="zoho-info-line editable-info-line"><span>{field.label} <button className="inline-pencil" onClick={() => onEdit(field)}>✎</button></span><strong>{displayField(record, field)}</strong></div>; }
function DocSlot({ label, docs }: { label: string; docs?: Doc[] }) { return <div className="zoho-info-line"><span>{label}</span><strong>{docs?.length ? docs.map((doc) => <DocumentLink key={doc.id} doc={doc} />) : "—"}</strong></div>; }
function DocumentLink({ doc }: { doc: Doc }) { if (!doc.file_url) return <span>{doc.file_name || doc.category || "Documento"}</span>; return <a href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name || doc.category}</a>; }
