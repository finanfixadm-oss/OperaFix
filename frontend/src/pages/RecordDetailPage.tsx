import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson, publicBaseUrl, uploadForm } from "../api";
import type { DocumentItem, RecordItem } from "../types-records";

const allCategories = [
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

type FieldType = "text" | "number" | "date" | "boolean";

type EditableFieldConfig = {
  keyName: keyof RecordItem;
  label: string;
  type?: FieldType;
  money?: boolean;
  date?: boolean;
};

function valueOrDash(value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function formatMoney(value?: number | string | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL");
}

function inputDateValue(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeCategory(category?: string | null) {
  return String(category || "").replace(/_/g, " ").toLowerCase();
}

export default function RecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<RecordItem | null>(null);
  const [tab, setTab] = useState("notas");
  const [note, setNote] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Poder");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  async function loadRecord() {
    const data = await fetchJson<RecordItem>(`/records/${id}`);
    setRecord(data);
  }

  useEffect(() => {
    if (id) loadRecord().catch(console.error);
  }, [id]);

  async function saveNote() {
    if (!note.trim()) return;
    await postJson(`/records/${id}/notes`, { content: note });
    setNote("");
    await loadRecord();
  }

  async function saveInline(field: keyof RecordItem, value: string | boolean, label: string) {
    if (!record) return;

    const payload = {
      ...record,
      [field]: value,
      __changed_field: String(field),
      __changed_label: label,
    };

    const updated = await fetchJson<RecordItem>(`/records/${record.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setRecord(updated);
  }

  async function uploadDocument() {
    if (!uploadFile) {
      alert("Selecciona un archivo.");
      return;
    }

    setUploadSaving(true);
    try {
      const formData = new FormData();
      formData.append("category", uploadCategory);
      formData.append("file", uploadFile);
      await uploadForm(`/records/${id}/documents/upload`, formData);
      setUploadFile(null);
      setUploadOpen(false);
      await loadRecord();
    } catch (error) {
      console.error(error);
      alert("No se pudo subir el documento.");
    } finally {
      setUploadSaving(false);
    }
  }

  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, DocumentItem[]> = {};
    for (const document of record?.documents || []) {
      const key = normalizeCategory(document.category);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(document);
    }
    return grouped;
  }, [record?.documents]);

  if (!record) return <div className="zoho-empty">Cargando ficha...</div>;

  const companyName = record.razon_social || record.company?.razon_social || "Sin razón social";
  const motive = record.motivo_tipo_exceso || record.management_type || "Sin motivo";

  return (
    <div className="record-detail-page">
      <div className="record-header-card">
        <button className="zoho-btn" onClick={() => navigate("/records")}>←</button>
        <div className="record-logo-box">finanfix<br /><small>Solutions SpA</small></div>
        <div className="record-header-actions">
          <button className="zoho-btn zoho-btn-primary">Enviar correo electrónico</button>
          <button className="zoho-btn">Editar</button>
          <button className="zoho-btn">...</button>
          <button className="zoho-btn">‹</button>
          <button className="zoho-btn">›</button>
        </div>
        <div className="record-header-title">
          <span>Razón Social:</span> <strong>{companyName}</strong><br />
          <span>Motivo (Tipo de exceso):</span> <strong>{motive}</strong>
        </div>
      </div>

      <div className="record-tabs">
        {[
          ["notas", "NOTAS"],
          ["correos", "CORREOS"],
          ["cronologia", "CRONOLOGÍA"],
          ["archivos", "ARCHIVOS ADJUNTOS"],
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div className="record-tab-card">
        {tab === "notas" && (
          <div>
            <h3>Notas</h3>
            <select className="zoho-select record-small-select"><option>Recientes Última</option></select>
            <div className="record-note-row">
              <input className="zoho-input" placeholder="Agregar una nota" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="zoho-btn zoho-btn-primary" onClick={saveNote}>Guardar</button>
            </div>
            {(record.notes || []).map((item) => <div className="record-timeline-item" key={item.id}>{item.content}</div>)}
          </div>
        )}
        {tab === "correos" && <div className="record-mail-folders"><span>Enviados</span><span>Programados</span><span>Borradores</span></div>}
        {tab === "cronologia" && (record.activities || []).map((item) => <div className="record-timeline-item" key={item.id}>{item.description}</div>)}
        {tab === "archivos" && (record.documents || []).map((doc) => <DocumentLink key={doc.id} doc={doc} />)}
      </div>

      <div className="record-detail-grid">
        <DetailSection title="DATOS EMPRESA">
          <StaticInfo label="Mandante" value={record.mandante?.name} />
          <EditableInfo record={record} field={{ keyName: "estado_contrato_cliente", label: "Estado contrato con cliente" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "fecha_termino_contrato", label: "Fecha término de contrato", type: "date", date: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "grupo_empresa", label: "Buscar Grupo" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "razon_social", label: "Razón Social" }} onSave={saveInline} fallback={record.company?.razon_social} />
          <EditableInfo record={record} field={{ keyName: "rut", label: "RUT" }} onSave={saveInline} fallback={record.company?.rut} />
          <StaticInfo label="Dirección" value="—" />
          <EditableInfo record={record} field={{ keyName: "comment", label: "Comentario" }} onSave={saveInline} />
          <DocSlot label="Poder" docs={documentsByCategory["poder"]} onAttach={() => { setUploadCategory("Poder"); setUploadOpen(true); }} />
        </DetailSection>

        <DetailSection title="DATOS BANCARIOS">
          <EditableInfo record={record} field={{ keyName: "banco", label: "Banco" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "tipo_cuenta", label: "Tipo de Cuenta" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "numero_cuenta", label: "Número cuenta" }} onSave={saveInline} />
        </DetailSection>

        <DetailSection title="ANTECEDENTES RECHAZO">
          <EditableInfo record={record} field={{ keyName: "fecha_rechazo", label: "Fecha Rechazo", type: "date", date: true }} onSave={saveInline} />
          <DocSlot label="Comprobante rechazo" docs={documentsByCategory["comprobante rechazo"]} onAttach={() => { setUploadCategory("Comprobante rechazo"); setUploadOpen(true); }} />
          <EditableInfo record={record} field={{ keyName: "motivo_rechazo", label: "Motivo del rechazo/anulación" }} onSave={saveInline} />
        </DetailSection>

        <DetailSection title="INFORMACIÓN DE GESTIÓN">
          <EditableInfo record={record} field={{ keyName: "mes_produccion_2026", label: "Mes de producción 2026" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "motivo_tipo_exceso", label: "Motivo (Tipo de exceso)" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "confirmacion_poder", label: "Confirmación Poder", type: "boolean" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "estado_gestion", label: "Estado Gestión" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "consulta_cen", label: "Consulta CEN" }} onSave={saveInline} />
          <StaticInfo label="Mes de ingreso solicitud" value={record.mes_produccion_2026} />
          <EditableInfo record={record} field={{ keyName: "envio_afp", label: "Envío AFP" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "confirmacion_cc", label: "Confirmación CC", type: "boolean" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "fecha_presentacion_afp", label: "Fecha Presentación AFP", type: "date", date: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "respuesta_cen", label: "Respuesta CEN" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "numero_solicitud", label: "N° Solicitud" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "entidad", label: "Entidad (AFP)" }} onSave={saveInline} fallback={record.lineAfp?.afp_name} />
          <EditableInfo record={record} field={{ keyName: "acceso_portal", label: "Acceso portal" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "fecha_ingreso_afp", label: "Fecha ingreso AFP", type: "date", date: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "estado_trabajador", label: "Estado Trabajador" }} onSave={saveInline} />
        </DetailSection>

        <DetailSection title="ARCHIVOS / RESPALDO" wide>
          <div className="record-doc-matrix">
            <DocSlot label="Carta explicativa" docs={documentsByCategory["carta explicativa"]} onAttach={() => { setUploadCategory("Carta explicativa"); setUploadOpen(true); }} />
            <DocSlot label="Archivo AFP" docs={documentsByCategory["archivo afp"]} onAttach={() => { setUploadCategory("Archivo AFP"); setUploadOpen(true); }} />
            <DocSlot label="Detalle de pago" docs={documentsByCategory["detalle trabajadores"] || documentsByCategory["detalle de pago"]} onAttach={() => { setUploadCategory("Detalle de pago"); setUploadOpen(true); }} />
            <DocSlot label="Comprobante pago" docs={documentsByCategory["comprobante pago"]} onAttach={() => { setUploadCategory("Comprobante pago"); setUploadOpen(true); }} />
            <DocSlot label="Archivo respuesta CEN" docs={documentsByCategory["respuesta cen"] || documentsByCategory["archivo respuesta cen"]} onAttach={() => { setUploadCategory("Archivo respuesta CEN"); setUploadOpen(true); }} />
          </div>
        </DetailSection>

        <DetailSection title="MONTOS RECUPERACIÓN">
          <EditableInfo record={record} field={{ keyName: "monto_devolucion", label: "Monto Devolución", type: "number", money: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "monto_cliente", label: "Monto cliente", type: "number", money: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "monto_finanfix_solutions", label: "Monto Finanfix", type: "number", money: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "monto_pagado", label: "Monto Real Pagado", type: "number", money: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "monto_cliente", label: "Monto real cliente", type: "number", money: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "fee", label: "FEE", type: "number" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "monto_finanfix_solutions", label: "Monto real Finanfix Solutions", type: "number", money: true }} onSave={saveInline} />
        </DetailSection>

        <DetailSection title="DATOS FACTURACIÓN">
          <EditableInfo record={record} field={{ keyName: "facturado_finanfix", label: "Facturado Finanfix" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "facturado_cliente", label: "Facturado cliente" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "fecha_pago_afp", label: "Fecha Pago AFP", type: "date", date: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "fecha_factura_finanfix", label: "Fecha Factura Finanfix", type: "date", date: true }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "fecha_pago_factura_finanfix", label: "Fecha pago factura Finanfix", type: "date", date: true }} onSave={saveInline} />
          <StaticInfo label="Fecha notificación cliente" value="—" />
          <EditableInfo record={record} field={{ keyName: "numero_factura", label: "N° Factura" }} onSave={saveInline} />
          <EditableInfo record={record} field={{ keyName: "numero_oc", label: "N° OC" }} onSave={saveInline} />
          <DocSlot label="Factura" docs={documentsByCategory["factura"]} onAttach={() => { setUploadCategory("Factura"); setUploadOpen(true); }} />
          <DocSlot label="OC" docs={documentsByCategory["orden compra"] || documentsByCategory["oc"]} onAttach={() => { setUploadCategory("OC"); setUploadOpen(true); }} />
        </DetailSection>
      </div>

      <ZohoModal title="Adjuntar documento" isOpen={uploadOpen} onClose={() => setUploadOpen(false)}>
        <div className="zoho-form-grid">
          <div className="zoho-form-field">
            <label>Tipo de documento</label>
            <select className="zoho-select" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>
              {allCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="zoho-form-field">
            <label>Archivo</label>
            <input className="zoho-input" type="file" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
          </div>
        </div>
        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setUploadOpen(false)}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={uploadDocument} disabled={uploadSaving}>{uploadSaving ? "Subiendo..." : "Subir documento"}</button>
        </div>
      </ZohoModal>
    </div>
  );
}

function DetailSection({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return <section className={`record-detail-section ${wide ? "wide" : ""}`}><h2>{title}</h2><div className="record-info-grid">{children}</div></section>;
}

function StaticInfo({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return <div className="record-info-field"><span>{label}</span><strong>{valueOrDash(value)}</strong></div>;
}

function EditableInfo({ record, field, onSave, fallback }: { record: RecordItem; field: EditableFieldConfig; onSave: (field: keyof RecordItem, value: string | boolean, label: string) => Promise<void>; fallback?: string | number | boolean | null }) {
  const rawValue = record[field.keyName] ?? fallback ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(field.date ? inputDateValue(String(rawValue || "")) : String(rawValue ?? ""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(field.date ? inputDateValue(String(rawValue || "")) : String(rawValue ?? ""));
  }, [rawValue, field.date]);

  async function commit() {
    setSaving(true);
    try {
      await onSave(field.keyName, field.type === "boolean" ? draft === "true" : draft, field.label);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  let display: string;
  if (field.money) display = formatMoney(rawValue as any);
  else if (field.date) display = formatDate(String(rawValue || ""));
  else display = valueOrDash(rawValue as any);

  if (editing) {
    return (
      <div className="record-info-field editing">
        <span>{field.label}</span>
        <div className="inline-edit-row">
          {field.type === "boolean" ? (
            <select className="zoho-select" value={draft} onChange={(event) => setDraft(event.target.value)}>
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          ) : (
            <input className="zoho-input" type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={draft} onChange={(event) => setDraft(event.target.value)} />
          )}
          <button className="zoho-small-btn" onClick={commit} disabled={saving}>{saving ? "..." : "✓"}</button>
          <button className="zoho-small-btn" onClick={() => setEditing(false)}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="record-info-field editable" onClick={() => setEditing(true)} title="Clic para editar">
      <span>{field.label} <b className="edit-pencil">✎</b></span>
      <strong>{display}</strong>
    </div>
  );
}

function DocSlot({ label, docs, onAttach }: { label: string; docs?: DocumentItem[]; onAttach: () => void }) {
  return (
    <div className="record-info-field document-slot">
      <span>{label}</span>
      <strong>{docs?.length ? docs.map((doc) => <DocumentLink key={doc.id} doc={doc} />) : "—"}</strong>
      <button className="zoho-small-btn" onClick={onAttach}>Adjuntar</button>
    </div>
  );
}

function DocumentLink({ doc }: { doc: DocumentItem }) {
  if (!doc.file_url) return <span>{doc.file_name || doc.category || "Documento"}</span>;
  return <a href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name || doc.category}</a>;
}
