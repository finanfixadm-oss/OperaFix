import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, publicBaseUrl, uploadForm } from "../api";
import type { DocumentItem, RecordItem } from "../types-records";

const documentGroups = [
  {
    title: "Archivos de armado / presentación",
    categories: ["Poder", "Carta explicativa", "Archivo AFP", "Archivo respuesta CEN"],
  },
  {
    title: "Archivos de respuesta / pago",
    categories: ["Detalle de pago", "Comprobante pago", "Comprobante rechazo"],
  },
  {
    title: "Archivos de facturación",
    categories: ["Factura", "OC"],
  },
];

const allCategories = documentGroups.flatMap((group) => group.categories).concat("Otro");

type TabKey = "notes" | "emails" | "timeline" | "files";

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL");
}

function normalizeCategory(category?: string | null) {
  const raw = String(category || "Otro").toUpperCase();
  const map: Record<string, string> = {
    PODER: "Poder",
    CARTA_EXPLICATIVA: "Carta explicativa",
    ARCHIVO_AFP: "Archivo AFP",
    ARCHIVO_GESTION: "Archivo AFP",
    RESPUESTA_CEN: "Archivo respuesta CEN",
    DETALLE_TRABAJADORES: "Detalle de pago",
    COMPROBANTE_PAGO: "Comprobante pago",
    FACTURA: "Factura",
    ORDEN_COMPRA: "OC",
    OTRO: "Otro",
  };
  return map[raw] || category || "Otro";
}

export default function RecordDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const recordId = params.id || params.managementId || "";

  const [record, setRecord] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Poder");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSaving, setUploadSaving] = useState(false);

  async function loadRecord() {
    if (!recordId) return;
    setLoading(true);
    try {
      const data = await fetchJson<RecordItem>(`/records/${recordId}`);
      setRecord(data);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar el registro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  async function saveNote() {
    if (!note.trim()) return;
    setNoteSaving(true);
    try {
      await fetchJson(`/records/${recordId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: note }),
      });
      setNote("");
      await loadRecord();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la nota.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function uploadDocument() {
    if (!uploadFile) {
      alert("Debes seleccionar un archivo.");
      return;
    }
    setUploadSaving(true);
    try {
      const formData = new FormData();
      formData.append("category", uploadCategory);
      formData.append("file", uploadFile);
      await uploadForm<DocumentItem>(`/records/${recordId}/documents/upload`, formData);
      setUploadFile(null);
      setUploadCategory("Poder");
      setUploadOpen(false);
      await loadRecord();
    } catch (error) {
      console.error(error);
      alert("No se pudo adjuntar el documento.");
    } finally {
      setUploadSaving(false);
    }
  }

  const documentsByCategory = useMemo(() => {
    return (record?.documents || []).reduce<Record<string, DocumentItem[]>>((acc, doc) => {
      const category = normalizeCategory(doc.category);
      if (!acc[category]) acc[category] = [];
      acc[category].push(doc);
      return acc;
    }, {});
  }, [record?.documents]);

  if (loading) return <div className="zoho-empty">Cargando ficha...</div>;
  if (!record) return <div className="zoho-empty">Registro no encontrado.</div>;

  return (
    <div className="zoho-module-page">
      <section className="record-hero-card">
        <div className="record-hero-logo">
          <img src="/finanfix-logo.png" alt="Finanfix" />
        </div>

        <div className="record-hero-main">
          <h1>{record.razon_social || record.company?.razon_social || "Sin razón social"}</h1>
          <p>{record.motivo_tipo_exceso || record.management_type || "Sin motivo"}</p>
        </div>

        <div className="record-hero-actions">
          <button className="zoho-btn zoho-btn-primary">Enviar correo electrónico</button>
          <button className="zoho-btn">Editar</button>
          <button className="zoho-btn">...</button>
          <button className="zoho-btn" onClick={() => navigate("/records")}>Volver</button>
        </div>
      </section>

      <section className="record-tabs-card">
        <div className="record-tabs">
          <button className={activeTab === "notes" ? "active" : ""} onClick={() => setActiveTab("notes")}>NOTAS</button>
          <button className={activeTab === "emails" ? "active" : ""} onClick={() => setActiveTab("emails")}>CORREOS</button>
          <button className={activeTab === "timeline" ? "active" : ""} onClick={() => setActiveTab("timeline")}>CRONOLOGÍA</button>
          <button className={activeTab === "files" ? "active" : ""} onClick={() => setActiveTab("files")}>ARCHIVOS ADJUNTOS</button>
        </div>

        <div className="record-tab-content">
          {activeTab === "notes" && (
            <div className="record-notes">
              <div className="record-tab-toolbar"><strong>Notas</strong><select className="zoho-select record-small-select"><option>Recientes Última</option></select></div>
              <textarea className="zoho-input zoho-textarea" placeholder="Agregar una nota" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="zoho-btn zoho-btn-primary" onClick={saveNote} disabled={noteSaving}>{noteSaving ? "Guardando..." : "Agregar nota"}</button>
              <div className="record-timeline-list">
                {(record.notes || []).map((item) => (
                  <div key={item.id} className="record-timeline-item"><strong>Nota</strong><p>{item.content}</p><span>{new Date(item.created_at).toLocaleString("es-CL")}</span></div>
                ))}
                {(record.notes || []).length === 0 && <div className="zoho-empty">Sin notas guardadas.</div>}
              </div>
            </div>
          )}

          {activeTab === "emails" && (
            <div>
              <div className="record-email-tabs"><button>Enviados</button><button>Programados</button><button>Borradores</button></div>
              <div className="zoho-empty">Sin correos electrónicos asociados.</div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="record-timeline-list">
              {(record.activities || []).map((item) => (
                <div key={item.id} className="record-timeline-item"><strong>{item.activity_type || "Actividad"}</strong><p>{item.description || item.status || "Sin detalle"}</p><span>{new Date(item.created_at).toLocaleString("es-CL")}</span></div>
              ))}
              {(record.activities || []).length === 0 && <div className="zoho-empty">Sin actividad registrada.</div>}
            </div>
          )}

          {activeTab === "files" && (
            <div className="record-file-list">
              {(record.documents || []).map((doc) => (
                <a key={doc.id} href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name}</a>
              ))}
              {(record.documents || []).length === 0 && <div className="zoho-empty">Sin archivos adjuntos.</div>}
            </div>
          )}
        </div>
      </section>

      <div className="record-detail-grid">
        <DetailSection title="DATOS EMPRESA">
          <Info label="Mandante" value={record.mandante?.name} />
          <Info label="Estado contrato con cliente" value={record.estado_contrato_cliente} />
          <Info label="Fecha término de contrato" value={formatDate(record.fecha_termino_contrato)} />
          <Info label="Buscar Grupo" value={record.grupo_empresa || record.group?.name} />
          <Info label="Razón Social" value={record.razon_social || record.company?.razon_social} />
          <Info label="RUT" value={record.rut || record.company?.rut} />
          <Info label="Dirección" value="—" />
          <Info label="Comentario" value={record.comment} />
        </DetailSection>

        <DetailSection title="DATOS BANCARIOS">
          <Info label="Banco" value={record.banco} />
          <Info label="Tipo de Cuenta" value={record.tipo_cuenta} />
          <Info label="Número cuenta" value={record.numero_cuenta} />
        </DetailSection>

        <DetailSection title="ANTECEDENTES RECHAZO">
          <Info label="Fecha Rechazo" value={formatDate(record.fecha_rechazo)} />
          <Info label="Comprobante rechazo" value={documentsByCategory["Comprobante rechazo"]?.[0]?.file_name || "—"} />
          <Info label="Motivo rechazo/anulación" value={record.motivo_rechazo} />
        </DetailSection>

        <DetailSection title="INFORMACIÓN DE GESTIÓN">
          <Info label="Mes de producción 2026" value={record.mes_produccion_2026} />
          <Info label="Motivo (Tipo de exceso)" value={record.motivo_tipo_exceso} />
          <Info label="Confirmación Poder" value={record.confirmacion_poder} />
          <Info label="Estado Gestión" value={record.estado_gestion} />
          <Info label="Consulta CEN" value={record.consulta_cen} />
          <Info label="Mes de ingreso solicitud" value={record.mes_produccion_2026} />
          <Info label="Envío AFP" value={record.envio_afp} />
          <Info label="Confirmación CC" value={record.confirmacion_cc} />
          <Info label="Fecha Presentación AFP" value={formatDate(record.fecha_presentacion_afp)} />
          <Info label="Respuesta CEN" value={record.respuesta_cen} />
          <Info label="N° Solicitud" value={record.numero_solicitud} />
          <Info label="Entidad (AFP)" value={record.entidad || record.lineAfp?.afp_name} />
          <Info label="Acceso portal" value={record.acceso_portal} />
          <Info label="Fecha ingreso AFP" value={formatDate(record.fecha_ingreso_afp)} />
          <Info label="Estado Trabajador" value={record.estado_trabajador} />
        </DetailSection>

        <DetailSection title="ARCHIVOS / RESPALDO" wide>
          <DocumentMatrix documentsByCategory={documentsByCategory} onAttach={(category) => { setUploadCategory(category); setUploadOpen(true); }} />
        </DetailSection>

        <DetailSection title="MONTOS RECUPERACIÓN">
          <Info label="Monto Devolución" value={formatMoney(record.monto_devolucion)} />
          <Info label="Monto cliente" value={formatMoney(record.monto_cliente)} />
          <Info label="Monto Finanfix" value={formatMoney(record.monto_finanfix_solutions)} />
          <Info label="Monto Real Pagado" value={formatMoney(record.monto_pagado)} />
          <Info label="Monto real cliente" value={formatMoney(record.monto_cliente)} />
          <Info label="FEE" value={record.fee ? `${record.fee}%` : "—"} />
          <Info label="Monto real Finanfix Solutions" value={formatMoney(record.monto_finanfix_solutions)} />
        </DetailSection>

        <DetailSection title="DATOS FACTURACIÓN">
          <Info label="Facturado Finanfix" value={record.facturado_finanfix} />
          <Info label="Facturado cliente" value={record.facturado_cliente} />
          <Info label="Fecha Pago AFP" value={formatDate(record.fecha_pago_afp)} />
          <Info label="Fecha Factura Finanfix" value={formatDate(record.fecha_factura_finanfix)} />
          <Info label="Fecha pago factura Finanfix" value={formatDate(record.fecha_pago_factura_finanfix)} />
          <Info label="Fecha notificación cliente" value="—" />
          <Info label="N° Factura" value={record.numero_factura} />
          <Info label="N° OC" value={record.numero_oc} />
          <Info label="Factura" value={documentsByCategory["Factura"]?.[0]?.file_name || "—"} />
          <Info label="OC" value={documentsByCategory["OC"]?.[0]?.file_name || "—"} />
        </DetailSection>
      </div>

      <ZohoModal title="Adjuntar documento" isOpen={uploadOpen} onClose={() => setUploadOpen(false)}>
        <div className="zoho-form-grid">
          <div className="zoho-form-field">
            <label>Tipo de documento</label>
            <select className="zoho-select" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
              {allCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="zoho-form-field">
            <label>Archivo</label>
            <input className="zoho-input" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
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

function Info({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return <div className="record-info-field"><span>{label}</span><strong>{valueOrDash(value)}</strong></div>;
}

function DocumentMatrix({ documentsByCategory, onAttach }: { documentsByCategory: Record<string, DocumentItem[]>; onAttach: (category: string) => void }) {
  const categories = ["Poder", "Carta explicativa", "Archivo AFP", "Detalle de pago", "Comprobante pago", "Comprobante rechazo", "Archivo respuesta CEN", "Factura", "OC"];
  return (
    <div className="record-doc-matrix">
      {categories.map((category) => {
        const docs = documentsByCategory[category] || [];
        return (
          <div className="record-doc-slot" key={category}>
            <div className="record-doc-title"><strong>{category}</strong><button className="zoho-small-btn" onClick={() => onAttach(category)}>Adjuntar</button></div>
            {docs.length === 0 ? <span className="record-doc-empty">Sin archivo</span> : docs.map((doc) => <a key={doc.id} href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name}</a>)}
          </div>
        );
      })}
    </div>
  );
}
