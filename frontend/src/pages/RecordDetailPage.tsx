import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson, publicBaseUrl, uploadForm } from "../api";
import type { DocumentItem, RecordItem } from "../types-records";

type MandanteOption = {
  id: string;
  name: string;
};

type EditState = {
  field: string;
  label: string;
  value: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  options?: Array<{ label: string; value: string }>;
};

type EmailDraft = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  entity?: string;
  warning?: string | null;
  documents: DocumentItem[];
};


type EmailTemplateKey = "ingreso_solicitud_entidad" | "confirmacion_entidad" | "rechazo_gestion" | "comprobante_detalle" | "informe_semanal_lm" | "correo_tipo" | "correo_colaboradores" | "libre";

type EmailTemplateOption = {
  key: EmailTemplateKey;
  label: string;
  description: string;
};

type BulkEditContextValue = {
  enabled: boolean;
  values: Record<string, string>;
  setValue: (field: string, value: string) => void;
};

const BulkEditContext = createContext<BulkEditContextValue>({
  enabled: false,
  values: {},
  setValue: () => {},
});



const emailTemplateOptions: EmailTemplateOption[] = [
  { key: "ingreso_solicitud_entidad", label: "Ingreso solicitud a entidad", description: "Cambio de estado: Ingreso solicitud a entidad." },
  { key: "confirmacion_entidad", label: "Ingreso por parte de entidad / N° solicitud", description: "Cambio de estado: Ingreso por parte de entidad." },
  { key: "rechazo_gestion", label: "Rechazo de gestión", description: "Cambio de estado: RECHAZO." },
  { key: "comprobante_detalle", label: "Envío comprobante y detalle de pago", description: "Cambio de estado: Pago realizado. Adjunta comprobante y detalle." },
  { key: "informe_semanal_lm", label: "Informe semanal de gestiones LM", description: "Resumen semanal/mensual de gestiones LM." },
  { key: "correo_tipo", label: "Correo tipo", description: "Comunicación manual estandarizada." },
  { key: "correo_colaboradores", label: "Correo tipo colaboradores", description: "Comunicación interna o a colaboradores." },
  { key: "libre", label: "Correo libre", description: "No aplica plantilla; permite escribir manualmente." },
];

function normalizeTemplateStatus(value?: string | null) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function suggestedTemplateForRecord(record: RecordItem): EmailTemplateKey {
  const status = normalizeTemplateStatus(record.estado_gestion || record.envio_afp);
  if (status.includes("rechazo") || status.includes("rechaz")) return "rechazo_gestion";
  if (status.includes("pag") || status.includes("comprobante")) return "comprobante_detalle";
  if (status.includes("numero") || status.includes("n solicitud") || status.includes("por parte de entidad")) return "confirmacion_entidad";
  if (status.includes("ingreso") || status.includes("envi") || status.includes("entidad")) return "ingreso_solicitud_entidad";
  if (status.includes("informe") || status.includes("semanal")) return "informe_semanal_lm";
  return "ingreso_solicitud_entidad";
}
function recordTemplateValues(record: RecordItem) {
  const mandante = record.mandante?.name || "Mandante";
  const razonSocial = record.razon_social || record.company?.razon_social || "Razón social";
  const rut = record.rut || record.company?.rut || "RUT";
  const entidad = record.entidad || record.lineAfp?.afp_name || "Entidad";
  const tipo = record.motivo_tipo_exceso || record.management_type || "gestión";
  const numeroSolicitud = record.numero_solicitud || "N° solicitud";
  const mes = record.mes_produccion_2026 || "MES AÑO";
  const monto = formatMoney(record.monto_real_finanfix_solutions || record.monto_pagado || record.monto_devolucion);
  const fechaPresentacion = formatDate(record.fecha_presentacion_afp);
  const fechaIngresoAfp = formatDate(record.fecha_ingreso_afp);
  const fechaPago = formatDate(record.fecha_pago_afp);
  const estadoGestion = record.estado_gestion || "Estado gestión";
  const motivoRechazo = record.motivo_rechazo || "Motivo de rechazo/anulación";
  return { mandante, razonSocial, rut, entidad, tipo, numeroSolicitud, mes, monto, fechaPresentacion, fechaIngresoAfp, fechaPago, estadoGestion, motivoRechazo };
}
function buildTemplateSubject(record: RecordItem, templateKey: EmailTemplateKey) {
  const v = recordTemplateValues(record);
  if (templateKey === "ingreso_solicitud_entidad") return `Ingreso solicitud a entidad - ${v.tipo} - ${v.razonSocial} - ${v.rut}`;
  if (templateKey === "confirmacion_entidad") return `Ingreso por parte de entidad / N° solicitud - ${v.razonSocial} - ${v.rut}`;
  if (templateKey === "rechazo_gestion") return `Rechazo de gestión - ${v.razonSocial} - ${v.rut}`;
  if (templateKey === "comprobante_detalle") return `Envío comprobante y detalle de pago - ${v.razonSocial} - ${v.rut}`;
  if (templateKey === "informe_semanal_lm") return `Informe semanal de gestiones LM - ${v.mes} - ${v.mandante}`;
  if (templateKey === "correo_colaboradores") return `Comunicación colaboradores - ${v.razonSocial}`;
  return `Gestión ${v.tipo} - ${v.razonSocial} - ${v.rut}`;
}

function buildTemplateBody(record: RecordItem, templateKey: EmailTemplateKey) {
  const v = recordTemplateValues(record);

  if (templateKey === "ingreso_solicitud_entidad") {
    return `Hola ${v.mandante},\n\nTe informamos que la solicitud correspondiente a ${v.tipo} del caso ${v.razonSocial}, RUT ${v.rut}, ya fue ingresada en ${v.entidad} y actualmente se encuentra en estado ${v.estadoGestion}.\n\nNos encontramos a la espera de la respuesta del ingreso de la solicitud por parte de la entidad. Apenas contemos con nueva información, se las haremos llegar.\n\nQuedamos atentos a cualquier consulta,\n\nSaludos cordiales,\nFinanfix Solutions SpA`;
  }

  if (templateKey === "confirmacion_entidad") {
    return `Hola ${v.mandante},\n\nTe informamos que la solicitud correspondiente a ${v.tipo} del caso ${v.razonSocial}, RUT ${v.rut}, se encuentra ingresada en ${v.entidad}.\n\nLa presentación se realizó con fecha ${v.fechaPresentacion} y fue recepcionada por la administradora el ${v.fechaIngresoAfp}. El número de solicitud asignado es ${v.numeroSolicitud}.\n\nNos encontramos a la espera de la respuesta por parte de la entidad. Apenas contemos con nueva información, te la haremos llegar.\n\nQuedamos atentos a cualquier consulta,\n\nSaludos cordiales,\nFinanfix Solutions SpA`;
  }

  if (templateKey === "rechazo_gestion") {
    return `Hola ${v.mandante},\n\nTe informamos que la solicitud correspondiente al caso ${v.razonSocial}, RUT ${v.rut}, ya fue ingresada en ${v.entidad} y actualmente se encuentra en estado ${v.estadoGestion}.\n\nLa presentación se realizó con fecha ${v.fechaPresentacion} y nos responden desde la administradora el rechazo/anulación de la solicitud. El número de solicitud asignado es ${v.numeroSolicitud}.\n\nEl motivo del rechazo informado por la entidad es: ${v.motivoRechazo}.\n\nQuedamos atentos a cualquier consulta,\n\nSaludos cordiales,\nFinanfix Solutions SpA`;
  }

  if (templateKey === "comprobante_detalle") {
    return `Hola ${v.mandante},\n\nTe informamos que ${v.entidad} nos ha enviado el comprobante y el detalle de pago. El depósito fue realizado con fecha ${v.fechaPago}, correspondiente al número de solicitud ${v.numeroSolicitud}, asociado al caso indicado a continuación:\n\nRazón Social: ${v.razonSocial}\nRUT: ${v.rut}\nMonto: ${v.monto}\n\nAdjuntamos comprobante de pago, detalle de pago, archivo de envío y carta explicativa para su revisión.\n\nAgradecería confirmar la recepción de este mensaje.\n\nQuedamos atentos ante cualquier duda o consulta adicional.\n\nSaludos cordiales,\nFinanfix Solutions SpA`;
  }

  if (templateKey === "informe_semanal_lm") {
    return `Hola ${v.mandante},\n\nLes comparto el informe correspondiente al período de: ${v.mes}.\n\nEn el archivo Excel adjunto podrás revisar el detalle de cada caso, donde se indican los siguientes estados:\n\n• Gestionado: solicitudes ingresadas y en proceso ante la administradora.\n\n• Pagado: gestiones que ya cuentan con devolución realizada.\n\n• Pendiente: casos que no han podido ser gestionados por falta de Cuenta Corriente (CC) y/o Poder vigente.\n\nEste archivo permite tener una visión completa de lo ya recuperado y de lo que aún se encuentra detenido por falta de antecedentes.\n\nQuedamos atentos a cualquier consulta,\n\nSaludos cordiales,\nFinanfix Solutions SpA`;
  }

  if (templateKey === "correo_colaboradores") {
    return `Hola {{Colaboradores.Nombre}},\n\nJunto con saludar,\n\nQuedo atento a cualquier consulta,\n\nSaludos cordiales,\nFinanfix Solutions SpA`;
  }

  return `Hola ${v.mandante},\n\nJunto con saludar,\n\nQuedo atento a cualquier consulta,\n\nSaludos cordiales,\nFinanfix Solutions SpA`;
}

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

function valueOrDash(value: unknown) {
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
  return new Date(value).toLocaleDateString("es-CL");
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function normalizedCategory(category?: string | null) {
  return String(category || "").replace(/_/g, " ").toLowerCase();
}


function getDocumentsForCategory(documentsByCategory: Record<string, DocumentItem[]>, category: string) {
  const key = normalizedCategory(category);
  const aliases: Record<string, string[]> = {
    "poder": ["poder"],
    "carta explicativa": ["carta explicativa"],
    "archivo afp": ["archivo afp", "archivo gestion", "archivo gestión"],
    "detalle de pago": ["detalle de pago", "detalle trabajadores"],
    "comprobante pago": ["comprobante pago", "comprobante de pago"],
    "comprobante rechazo": ["comprobante rechazo", "otro"],
    "archivo respuesta cen": ["archivo respuesta cen", "respuesta cen"],
    "factura": ["factura"],
    "oc": ["oc", "orden compra", "orden de compra"],
  };
  const keys = aliases[key] || [key];
  return keys.flatMap((item) => documentsByCategory[item] || []);
}

function boolString(value?: boolean | null) {
  return value ? "true" : "false";
}

function buildBulkForm(record: RecordItem) {
  const companyName = record.razon_social || record.company?.razon_social || "";
  return {
    mandante_id: String(record.mandante_id || record.mandante?.id || ""),
    estado_contrato_cliente: String(record.estado_contrato_cliente || ""),
    fecha_termino_contrato: toDateInput(record.fecha_termino_contrato),
    grupo_empresa: String(record.grupo_empresa || record.group?.name || ""),
    razon_social: String(companyName || ""),
    rut: String(record.rut || record.company?.rut || ""),
    direccion: String(record.direccion || ""),
    comment: String(record.comment || ""),
    banco: String(record.banco || ""),
    tipo_cuenta: String(record.tipo_cuenta || ""),
    numero_cuenta: String(record.numero_cuenta || ""),
    fecha_rechazo: toDateInput(record.fecha_rechazo),
    motivo_rechazo: String(record.motivo_rechazo || ""),
    mes_produccion_2026: String(record.mes_produccion_2026 || ""),
    motivo_tipo_exceso: String(record.motivo_tipo_exceso || ""),
    confirmacion_poder: boolString(record.confirmacion_poder),
    estado_gestion: String(record.estado_gestion || ""),
    consulta_cen: String(record.consulta_cen || ""),
    mes_ingreso_solicitud: String(record.mes_ingreso_solicitud || ""),
    envio_afp: String(record.envio_afp || ""),
    confirmacion_cc: boolString(record.confirmacion_cc),
    fecha_presentacion_afp: toDateInput(record.fecha_presentacion_afp),
    respuesta_cen: String(record.respuesta_cen || ""),
    numero_solicitud: String(record.numero_solicitud || ""),
    entidad: String(record.entidad || record.lineAfp?.afp_name || ""),
    acceso_portal: String(record.acceso_portal || ""),
    fecha_ingreso_afp: toDateInput(record.fecha_ingreso_afp),
    estado_trabajador: String(record.estado_trabajador || ""),
    monto_devolucion: String(record.monto_devolucion ?? ""),
    monto_cliente: String(record.monto_cliente ?? ""),
    monto_finanfix_solutions: String(record.monto_finanfix_solutions ?? ""),
    monto_pagado: String(record.monto_pagado ?? ""),
    monto_real_cliente: String(record.monto_real_cliente ?? ""),
    fee: String(record.fee ?? ""),
    monto_real_finanfix_solutions: String(record.monto_real_finanfix_solutions ?? ""),
    facturado_finanfix: String(record.facturado_finanfix || ""),
    facturado_cliente: String(record.facturado_cliente || ""),
    fecha_pago_afp: toDateInput(record.fecha_pago_afp),
    fecha_factura_finanfix: toDateInput(record.fecha_factura_finanfix),
    fecha_pago_factura_finanfix: toDateInput(record.fecha_pago_factura_finanfix),
    fecha_notificacion_cliente: toDateInput(record.fecha_notificacion_cliente),
    numero_factura: String(record.numero_factura || ""),
    numero_oc: String(record.numero_oc || ""),
  };
}


function getDocumentUrl(doc: DocumentItem) {
  if (!doc.file_url) return "";
  return doc.file_url.startsWith("http") ? doc.file_url : `${publicBaseUrl}${doc.file_url}`;
}

function getDocumentExtension(doc: DocumentItem) {
  const source = `${doc.file_name || ""} ${doc.file_url || ""}`.toLowerCase();
  const clean = source.split("?")[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match?.[1] || "";
}

function canPreviewDocument(doc: DocumentItem) {
  const mime = String(doc.mime_type || "").toLowerCase();
  const ext = getDocumentExtension(doc);
  return mime.includes("pdf") || mime.startsWith("image/") || ["pdf", "png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext);
}

function isImageDocument(doc: DocumentItem) {
  const mime = String(doc.mime_type || "").toLowerCase();
  const ext = getDocumentExtension(doc);
  return mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext);
}

export default function RecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState<RecordItem | null>(null);
  const [mandantes, setMandantes] = useState<MandanteOption[]>([]);
  const [tab, setTab] = useState<"notas" | "correos" | "cronologia" | "archivos">("notas");
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [bulkForm, setBulkForm] = useState<Record<string, string>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Poder");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<EmailTemplateKey>("ingreso_solicitud_entidad");
  const [selectedEmailDocs, setSelectedEmailDocs] = useState<Record<string, boolean>>({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  async function loadRecord() {
    const data = await fetchJson<RecordItem>(`/records/${id}`);
    setRecord(data);
  }

  async function loadMandantes() {
    try {
      const data = await fetchJson<MandanteOption[]>("/mandantes");
      setMandantes(data);
    } catch (error) {
      console.error(error);
      setMandantes([]);
    }
  }

  useEffect(() => {
    if (id) {
      loadRecord().catch(console.error);
      loadMandantes();
    }
  }, [id]);

  async function saveNote() {
    if (!note.trim()) return;
    await postJson(`/records/${id}/notes`, { content: note });
    setNote("");
    await loadRecord();
  }

  function openEdit(
    field: string,
    label: string,
    current: unknown,
    type: EditState["type"] = "text",
    options?: EditState["options"]
  ) {
    setEdit({
      field,
      label,
      value: type === "date" ? toDateInput(String(current || "")) : String(current ?? ""),
      type,
      options,
    });
  }

  async function saveInlineEdit() {
    if (!edit) return;

    setEditSaving(true);
    try {
      await fetchJson(`/records/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          [edit.field]: edit.value,
        }),
      });
      setEdit(null);
      await loadRecord();
    } catch (error) {
      console.error(error);
      alert("No se pudo modificar el campo.");
    } finally {
      setEditSaving(false);
    }
  }



  function startBulkEdit() {
    if (!record) return;
    setBulkForm(buildBulkForm(record));
    setBulkEdit(true);
  }

  function cancelBulkEdit() {
    setBulkEdit(false);
    setBulkForm({});
  }

  function setBulkField(field: string, value: string) {
    setBulkForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveBulkEdit() {
    setBulkSaving(true);
    try {
      await fetchJson(`/records/${id}`, {
        method: "PUT",
        body: JSON.stringify(bulkForm),
      });
      setBulkEdit(false);
      await loadRecord();
    } catch (error) {
      console.error(error);
      alert("No se pudieron guardar los cambios del registro.");
    } finally {
      setBulkSaving(false);
    }
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
      setUploadOpen(false);
      setUploadFile(null);
      await loadRecord();
    } catch (error) {
      console.error(error);
      alert("No se pudo subir el documento.");
    } finally {
      setUploadSaving(false);
    }
  }

  async function deleteDocument(documentId: string) {
    if (!window.confirm("¿Eliminar este documento de la gestión?")) return;

    try {
      await fetchJson(`/records/documents/${documentId}`, { method: "DELETE" });
      await loadRecord();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el documento.");
    }
  }

  function openDocumentPreview(document: DocumentItem) {
    if (!canPreviewDocument(document)) {
      window.open(getDocumentUrl(document), "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewDoc(document);
  }



  async function openEmailComposer() {
    setEmailLoading(true);
    try {
      const draft = await fetchJson<EmailDraft>(`/records/${id}/email/compose`);
      const templateKey = record ? suggestedTemplateForRecord(record) : "ingreso_solicitud_entidad";
      setSelectedEmailTemplate(templateKey);
      setEmailDraft({
        ...draft,
        subject: record ? buildTemplateSubject(record, templateKey) : draft.subject,
        body: record ? buildTemplateBody(record, templateKey) : draft.body,
      });
      const initialSelection: Record<string, boolean> = {};
      for (const doc of draft.documents || []) {
        initialSelection[doc.id] = true;
      }
      setSelectedEmailDocs(initialSelection);
      setEmailOpen(true);
    } catch (error) {
      console.error(error);
      alert("No se pudo preparar el correo de la gestión.");
    } finally {
      setEmailLoading(false);
    }
  }

  function setEmailField(field: keyof EmailDraft, value: string) {
    setEmailDraft((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  function applyEmailTemplate(templateKey: EmailTemplateKey) {
    setSelectedEmailTemplate(templateKey);
    if (templateKey === "libre" || !record) return;
    setEmailDraft((prev) => prev ? {
      ...prev,
      subject: buildTemplateSubject(record, templateKey),
      body: buildTemplateBody(record, templateKey),
    } : prev);
  }

  function toggleEmailDocument(documentId: string) {
    setSelectedEmailDocs((prev) => ({ ...prev, [documentId]: !prev[documentId] }));
  }

  async function sendRecordEmail() {
    if (!emailDraft) return;
    if (!emailDraft.to.trim()) {
      alert("Debes indicar el correo destino.");
      return;
    }

    const documentIds = Object.entries(selectedEmailDocs)
      .filter(([, selected]) => selected)
      .map(([documentId]) => documentId);

    setEmailSending(true);
    try {
      const result = await postJson<{ ok: boolean; status: string; detail: string }>(`/records/${id}/email/send`, {
        to: emailDraft.to,
        cc: emailDraft.cc || "",
        bcc: emailDraft.bcc || "",
        subject: emailDraft.subject,
        body: emailDraft.body,
        template_key: selectedEmailTemplate,
        document_ids: documentIds,
      });

      setEmailOpen(false);
      await loadRecord();
      if (result.ok) {
        alert("Correo enviado y trazabilidad registrada.");
      } else {
        alert(result.detail || "El correo quedó registrado, pero falta configurar el envío real.");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo enviar el correo.");
    } finally {
      setEmailSending(false);
    }
  }

  const documentsByCategory = useMemo(() => {
    const map: Record<string, DocumentItem[]> = {};
    for (const doc of record?.documents || []) {
      const key = normalizedCategory(doc.category);
      if (!map[key]) map[key] = [];
      map[key].push(doc);
    }
    return map;
  }, [record?.documents]);

  if (!record) return <div className="zoho-empty">Cargando ficha...</div>;

  const companyName = record.razon_social || record.company?.razon_social || "Sin razón social";
  const motive = record.motivo_tipo_exceso || record.management_type || "Sin motivo";

  return (
    <div className="record-detail-page">
      <div className="record-header-card">
        <button className="zoho-btn" onClick={() => navigate("/records")}>←</button>

        <div className="record-logo">
          <strong>finanfix</strong>
          <span>Solutions SpA</span>
        </div>

        <div className="record-header-actions">
          <button className="zoho-btn zoho-btn-primary" onClick={openEmailComposer} disabled={emailLoading}>
            {emailLoading ? "Preparando correo..." : "Enviar correo electrónico"}
          </button>
          <button
            className="zoho-btn"
            onClick={startBulkEdit}
          >
            {bulkEdit ? "Editando" : "Editar"}
          </button>
          <button className="zoho-btn">...</button>
          <button className="zoho-btn">‹</button>
          <button className="zoho-btn">›</button>
        </div>

        <div className="record-title-lines">
          <div><span>Razón Social:</span> <strong>{companyName}</strong></div>
          <div><span>Motivo (Tipo de exceso):</span> <strong>{motive}</strong></div>
        </div>
      </div>

      {bulkEdit && (
        <div className="record-bulk-edit-bar">
          <strong>Modo edición masiva activo</strong>
          <span>Modifica los campos de las secciones inferiores y guarda todo junto.</span>
          <button className="zoho-btn" onClick={cancelBulkEdit} disabled={bulkSaving}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={saveBulkEdit} disabled={bulkSaving}>
            {bulkSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}

      <div className="record-tabs">
        {[
          ["notas", "NOTAS"],
          ["correos", "CORREOS"],
          ["cronologia", "CRONOLOGÍA"],
          ["archivos", "ARCHIVOS ADJUNTOS"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="record-tab-card">
        {tab === "notas" && (
          <>
            <h3>Notas</h3>
            <select className="zoho-select record-small-select">
              <option>Recientes Última</option>
            </select>
            <div className="record-note-row">
              <input
                className="zoho-input"
                placeholder="Agregar una nota"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button className="zoho-btn zoho-btn-primary" onClick={saveNote}>Guardar</button>
            </div>
            {(record.notes || []).map((item) => (
              <div className="record-timeline-item" key={item.id}>{item.content}</div>
            ))}
          </>
        )}

        {tab === "correos" && (
          <div className="record-mail-panel">
            <div className="record-mail-folders">
              <span>Enviados</span>
              <span>Programados</span>
              <span>Borradores</span>
            </div>
            {(record.activities || []).filter((item) => item.activity_type === "CORREO").length === 0 ? (
              <div className="zoho-empty">Sin correos enviados o registrados.</div>
            ) : (
              (record.activities || [])
                .filter((item) => item.activity_type === "CORREO")
                .map((item) => (
                  <div className="record-timeline-item" key={item.id}>
                    <strong>{item.status || "CORREO"}</strong>: {item.description || "—"}
                  </div>
                ))
            )}
          </div>
        )}

        {tab === "cronologia" && (
          (record.activities || []).length === 0 ? (
            <div className="zoho-empty">Sin cronología.</div>
          ) : (
            (record.activities || []).map((item) => (
              <div className="record-timeline-item" key={item.id}>
                <strong>{item.activity_type || "Actividad"}</strong>: {item.description || "—"}
              </div>
            ))
          )
        )}

        {tab === "archivos" && (
          (record.documents || []).length === 0 ? (
            <div className="zoho-empty">Sin archivos adjuntos.</div>
          ) : (
            (record.documents || []).map((doc) => <DocumentLink key={doc.id} doc={doc} onDelete={deleteDocument} onPreview={openDocumentPreview} />)
          )
        )}
      </div>

      <BulkEditContext.Provider value={{ enabled: bulkEdit, values: bulkForm, setValue: setBulkField }}>
      <div className="record-sections-grid">
        <DetailSection title="DATOS EMPRESA">
          <EditableInfo
            label="Mandante"
            value={record.mandante_id}
            field="mandante_id"
            type="select"
            options={mandantes.map((item) => ({ label: item.name, value: item.id }))}
            onEdit={openEdit}
            displayValue={record.mandante?.name}
          />
          <EditableInfo label="Estado contrato con cliente" value={record.estado_contrato_cliente} field="estado_contrato_cliente" onEdit={openEdit} />
          <EditableInfo label="Fecha término de contrato" value={toDateInput(record.fecha_termino_contrato)} displayValue={formatDate(record.fecha_termino_contrato)} field="fecha_termino_contrato" type="date" onEdit={openEdit} />
          <EditableInfo label="Buscar Grupo" value={record.grupo_empresa || record.group?.name} field="grupo_empresa" onEdit={openEdit} />
          <EditableInfo label="Razón Social" value={companyName} field="razon_social" onEdit={openEdit} />
          <EditableInfo label="RUT" value={record.rut || record.company?.rut} field="rut" onEdit={openEdit} />
          <EditableInfo label="Dirección" value={record.direccion} field="direccion" onEdit={openEdit} />
          <EditableInfo label="Comentario" value={record.comment} field="comment" type="textarea" onEdit={openEdit} />
          <DocSlot label="Poder" docs={getDocumentsForCategory(documentsByCategory, "Poder")} onAttach={() => { setUploadCategory("Poder"); setUploadOpen(true); }} onDelete={deleteDocument} onPreview={openDocumentPreview} />
        </DetailSection>

        <DetailSection title="DATOS BANCARIOS">
          <EditableInfo label="Banco" value={record.banco} field="banco" onEdit={openEdit} />
          <EditableInfo label="Tipo de Cuenta" value={record.tipo_cuenta} field="tipo_cuenta" onEdit={openEdit} />
          <EditableInfo label="Número cuenta" value={record.numero_cuenta} field="numero_cuenta" onEdit={openEdit} />
        </DetailSection>

        <DetailSection title="ANTECEDENTES RECHAZO">
          <EditableInfo label="Fecha Rechazo" value={toDateInput(record.fecha_rechazo)} displayValue={formatDate(record.fecha_rechazo)} field="fecha_rechazo" type="date" onEdit={openEdit} />
          <DocSlot label="Comprobante rechazo" docs={getDocumentsForCategory(documentsByCategory, "Comprobante rechazo")} onAttach={() => { setUploadCategory("Comprobante rechazo"); setUploadOpen(true); }} onDelete={deleteDocument} onPreview={openDocumentPreview} />
          <EditableInfo label="Motivo del rechazo/anulación" value={record.motivo_rechazo} field="motivo_rechazo" onEdit={openEdit} />
        </DetailSection>

        <DetailSection title="INFORMACIÓN DE GESTIÓN">
          <EditableInfo label="Mes de producción 2026" value={record.mes_produccion_2026} field="mes_produccion_2026" onEdit={openEdit} />
          <EditableInfo label="Motivo (Tipo de exceso)" value={record.motivo_tipo_exceso} field="motivo_tipo_exceso" onEdit={openEdit} />
          <EditableInfo label="Confirmación Poder" value={boolString(record.confirmacion_poder)} displayValue={valueOrDash(record.confirmacion_poder)} field="confirmacion_poder" type="select" options={[{label:"Sí", value:"true"}, {label:"No", value:"false"}]} onEdit={openEdit} />
          <EditableInfo label="Estado Gestión" value={record.estado_gestion} field="estado_gestion" type="select" options={["Pendiente Gestión","En preparación","Enviada AFP","Respondida AFP","Pagada","Facturada","Cerrada","Rechazada"].map(x => ({label:x,value:x}))} onEdit={openEdit} />
          <EditableInfo label="Consulta CEN" value={record.consulta_cen} field="consulta_cen" onEdit={openEdit} />
          <EditableInfo label="Mes de ingreso solicitud" value={record.mes_ingreso_solicitud || record.mes_produccion_2026} field="mes_ingreso_solicitud" onEdit={openEdit} />
          <EditableInfo label="Envío AFP" value={record.envio_afp} field="envio_afp" type="select" options={["Pendiente","Enviado","Respondido","Rechazado"].map(x => ({label:x,value:x}))} onEdit={openEdit} />
          <EditableInfo label="Confirmación CC" value={boolString(record.confirmacion_cc)} displayValue={valueOrDash(record.confirmacion_cc)} field="confirmacion_cc" type="select" options={[{label:"Sí", value:"true"}, {label:"No", value:"false"}]} onEdit={openEdit} />
          <EditableInfo label="Fecha Presentación AFP" value={toDateInput(record.fecha_presentacion_afp)} displayValue={formatDate(record.fecha_presentacion_afp)} field="fecha_presentacion_afp" type="date" onEdit={openEdit} />
          <EditableInfo label="Respuesta CEN" value={record.respuesta_cen} field="respuesta_cen" onEdit={openEdit} />
          <EditableInfo label="N° Solicitud" value={record.numero_solicitud} field="numero_solicitud" onEdit={openEdit} />
          <EditableInfo label="Entidad (AFP)" value={record.entidad || record.lineAfp?.afp_name} field="entidad" onEdit={openEdit} />
          <EditableInfo label="Acceso portal" value={record.acceso_portal} field="acceso_portal" onEdit={openEdit} />
          <EditableInfo label="Fecha ingreso AFP" value={toDateInput(record.fecha_ingreso_afp)} displayValue={formatDate(record.fecha_ingreso_afp)} field="fecha_ingreso_afp" type="date" onEdit={openEdit} />
          <EditableInfo label="Estado Trabajador" value={record.estado_trabajador} field="estado_trabajador" onEdit={openEdit} />
        </DetailSection>

        <DetailSection title="ARCHIVOS / RESPALDO" wide>
          <DocumentMatrix documentsByCategory={documentsByCategory} onAttach={(category) => { setUploadCategory(category); setUploadOpen(true); }} onDelete={deleteDocument} onPreview={openDocumentPreview} />
        </DetailSection>

        <DetailSection title="MONTOS RECUPERACIÓN">
          <EditableInfo label="Monto Devolución" value={String(record.monto_devolucion ?? "")} displayValue={formatMoney(record.monto_devolucion)} field="monto_devolucion" type="number" onEdit={openEdit} />
          <EditableInfo label="Monto cliente" value={String(record.monto_cliente ?? "")} displayValue={formatMoney(record.monto_cliente)} field="monto_cliente" type="number" onEdit={openEdit} />
          <EditableInfo label="Monto Finanfix" value={String(record.monto_finanfix_solutions ?? "")} displayValue={formatMoney(record.monto_finanfix_solutions)} field="monto_finanfix_solutions" type="number" onEdit={openEdit} />
          <EditableInfo label="Monto Real Pagado" value={String(record.monto_pagado ?? "")} displayValue={formatMoney(record.monto_pagado)} field="monto_pagado" type="number" onEdit={openEdit} />
          <EditableInfo label="Monto real cliente" value={String(record.monto_real_cliente ?? "")} displayValue={formatMoney(record.monto_real_cliente)} field="monto_real_cliente" type="number" onEdit={openEdit} />
          <EditableInfo label="FEE" value={String(record.fee ?? "")} displayValue={record.fee ? `${record.fee}%` : "—"} field="fee" type="number" onEdit={openEdit} />
          <EditableInfo label="Monto real Finanfix Solutions" value={String(record.monto_real_finanfix_solutions ?? "")} displayValue={formatMoney(record.monto_real_finanfix_solutions)} field="monto_real_finanfix_solutions" type="number" onEdit={openEdit} />
        </DetailSection>

        <DetailSection title="DATOS FACTURACIÓN">
          <EditableInfo label="Facturado Finanfix" value={record.facturado_finanfix} field="facturado_finanfix" type="select" options={["Sí","No","Pendiente"].map(x => ({label:x,value:x}))} onEdit={openEdit} />
          <EditableInfo label="Facturado cliente" value={record.facturado_cliente} field="facturado_cliente" type="select" options={["Sí","No","Pendiente"].map(x => ({label:x,value:x}))} onEdit={openEdit} />
          <EditableInfo label="Fecha Pago AFP" value={toDateInput(record.fecha_pago_afp)} displayValue={formatDate(record.fecha_pago_afp)} field="fecha_pago_afp" type="date" onEdit={openEdit} />
          <EditableInfo label="Fecha Factura Finanfix" value={toDateInput(record.fecha_factura_finanfix)} displayValue={formatDate(record.fecha_factura_finanfix)} field="fecha_factura_finanfix" type="date" onEdit={openEdit} />
          <EditableInfo label="Fecha pago factura Finanfix" value={toDateInput(record.fecha_pago_factura_finanfix)} displayValue={formatDate(record.fecha_pago_factura_finanfix)} field="fecha_pago_factura_finanfix" type="date" onEdit={openEdit} />
          <EditableInfo label="Fecha notificación cliente" value={toDateInput(record.fecha_notificacion_cliente)} displayValue={formatDate(record.fecha_notificacion_cliente)} field="fecha_notificacion_cliente" type="date" onEdit={openEdit} />
          <EditableInfo label="N° Factura" value={record.numero_factura} field="numero_factura" onEdit={openEdit} />
          <EditableInfo label="N° OC" value={record.numero_oc} field="numero_oc" onEdit={openEdit} />
          <DocSlot label="Factura" docs={getDocumentsForCategory(documentsByCategory, "Factura")} onAttach={() => { setUploadCategory("Factura"); setUploadOpen(true); }} onDelete={deleteDocument} onPreview={openDocumentPreview} />
          <DocSlot label="OC" docs={getDocumentsForCategory(documentsByCategory, "OC")} onAttach={() => { setUploadCategory("OC"); setUploadOpen(true); }} onDelete={deleteDocument} onPreview={openDocumentPreview} />
        </DetailSection>
      </div>
      </BulkEditContext.Provider>

      <ZohoModal title={`Editar ${edit?.label || ""}`} isOpen={Boolean(edit)} onClose={() => setEdit(null)}>
        {edit && (
          <>
            <div className="zoho-form-field">
              <label>{edit.label}</label>
              {edit.type === "select" ? (
                <select className="zoho-select" value={edit.value} onChange={(event) => setEdit({ ...edit, value: event.target.value })}>
                  <option value="">Seleccionar</option>
                  {(edit.options || []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : edit.type === "textarea" ? (
                <textarea className="zoho-input zoho-textarea" value={edit.value} onChange={(event) => setEdit({ ...edit, value: event.target.value })} />
              ) : (
                <input className="zoho-input" type={edit.type} value={edit.value} onChange={(event) => setEdit({ ...edit, value: event.target.value })} />
              )}
            </div>
            <div className="zoho-form-actions">
              <button className="zoho-btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="zoho-btn zoho-btn-primary" onClick={saveInlineEdit} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </>
        )}
      </ZohoModal>

      <ZohoModal title="Enviar correo electrónico" isOpen={emailOpen} onClose={() => setEmailOpen(false)}>
        {emailDraft && (
          <>
            {emailDraft.warning && <div className="record-email-warning">{emailDraft.warning}</div>}
            <div className="zoho-form-grid">
              <div className="zoho-form-field zoho-form-field-wide">
                <label>Plantilla según estado de gestión</label>
                <select className="zoho-select" value={selectedEmailTemplate} onChange={(event) => applyEmailTemplate(event.target.value as EmailTemplateKey)}>
                  {emailTemplateOptions.map((template) => (
                    <option key={template.key} value={template.key}>{template.label}</option>
                  ))}
                </select>
                <small className="record-template-help">{emailTemplateOptions.find((item) => item.key === selectedEmailTemplate)?.description}</small>
              </div>
              <div className="zoho-form-field">
                <label>Para</label>
                <input className="zoho-input" value={emailDraft.to} onChange={(event) => setEmailField("to", event.target.value)} placeholder="correo@entidad.cl" />
              </div>
              <div className="zoho-form-field">
                <label>CC</label>
                <input className="zoho-input" value={emailDraft.cc || ""} onChange={(event) => setEmailField("cc", event.target.value)} />
              </div>
              <div className="zoho-form-field">
                <label>CCO</label>
                <input className="zoho-input" value={emailDraft.bcc || ""} onChange={(event) => setEmailField("bcc", event.target.value)} />
              </div>
              <div className="zoho-form-field zoho-form-field-wide">
                <label>Asunto</label>
                <input className="zoho-input" value={emailDraft.subject} onChange={(event) => setEmailField("subject", event.target.value)} />
              </div>
              <div className="zoho-form-field zoho-form-field-wide">
                <label>Mensaje</label>
                <textarea className="zoho-input zoho-textarea record-email-body" value={emailDraft.body} onChange={(event) => setEmailField("body", event.target.value)} />
              </div>
            </div>

            <div className="record-email-attachments">
              <div className="record-email-attachments-title">
                <strong>Archivos de la gestión</strong>
                <span>Selecciona con checklist los archivos que quieres adjuntar.</span>
              </div>
              {(emailDraft.documents || []).length === 0 ? (
                <div className="zoho-empty">Esta gestión no tiene archivos cargados.</div>
              ) : (
                (emailDraft.documents || []).map((doc) => (
                  <label className="record-email-doc-check" key={doc.id}>
                    <input type="checkbox" checked={Boolean(selectedEmailDocs[doc.id])} onChange={() => toggleEmailDocument(doc.id)} />
                    <span>{doc.file_name || doc.category}</span>
                    <small>{doc.category}</small>
                  </label>
                ))
              )}
            </div>

            <div className="zoho-form-actions">
              <button className="zoho-btn" onClick={() => setEmailOpen(false)} disabled={emailSending}>Cancelar</button>
              <button className="zoho-btn zoho-btn-primary" onClick={sendRecordEmail} disabled={emailSending}>
                {emailSending ? "Enviando..." : "Enviar y registrar trazabilidad"}
              </button>
            </div>
          </>
        )}
      </ZohoModal>

      <ZohoModal title="Adjuntar documento" isOpen={uploadOpen} onClose={() => setUploadOpen(false)}>
        <div className="zoho-form-grid">
          <div className="zoho-form-field">
            <label>Tipo de documento</label>
            <select className="zoho-select" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>
              {documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
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

      <ZohoModal title={previewDoc?.file_name || "Vista previa de documento"} isOpen={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)}>
        {previewDoc && (
          <div className="record-document-preview">
            <div className="record-document-preview-actions">
              <span><strong>Tipo:</strong> {previewDoc.category || "Documento"}</span>
              <a className="zoho-btn" href={getDocumentUrl(previewDoc)} target="_blank" rel="noreferrer">Abrir en otra pestaña</a>
              <a className="zoho-btn" href={getDocumentUrl(previewDoc)} download>Descargar</a>
              <button className="zoho-btn zoho-btn-danger" onClick={() => deleteDocument(previewDoc.id).then(() => setPreviewDoc(null))}>Eliminar</button>
            </div>
            {isImageDocument(previewDoc) ? (
              <img className="record-document-preview-image" src={getDocumentUrl(previewDoc)} alt={previewDoc.file_name || "Documento"} />
            ) : (
              <iframe className="record-document-preview-frame" src={getDocumentUrl(previewDoc)} title={previewDoc.file_name || "Documento"} />
            )}
          </div>
        )}
      </ZohoModal>
    </div>
  );
}

function DetailSection({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return <section className={`record-detail-section ${wide ? "wide" : ""}`}><h2>{title}</h2><div className="record-info-grid">{children}</div></section>;
}

function EditableInfo({
  label,
  value,
  displayValue,
  field,
  type = "text",
  options,
  onEdit,
}: {
  label: string;
  value?: string | number | boolean | null;
  displayValue?: string | number | boolean | null;
  field: string;
  type?: EditState["type"];
  options?: EditState["options"];
  onEdit: (field: string, label: string, current: unknown, type?: EditState["type"], options?: EditState["options"]) => void;
}) {
  const bulk = useContext(BulkEditContext);
  const bulkValue = bulk.values[field] ?? String(value ?? "");

  if (bulk.enabled) {
    return (
      <div className="record-info-field record-info-field-form">
        <span>{label}</span>
        {type === "select" ? (
          <select className="zoho-select" value={bulkValue} onChange={(event) => bulk.setValue(field, event.target.value)}>
            <option value="">Seleccionar</option>
            {(options || []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea className="zoho-input zoho-textarea" value={bulkValue} onChange={(event) => bulk.setValue(field, event.target.value)} />
        ) : (
          <input className="zoho-input" type={type} value={bulkValue} onChange={(event) => bulk.setValue(field, event.target.value)} />
        )}
      </div>
    );
  }

  return (
    <div className="record-info-field editable" onClick={() => onEdit(field, label, value ?? "", type, options)}>
      <span>{label} <button type="button" className="record-pencil" title="Editar">✎</button></span>
      <strong>{valueOrDash(displayValue ?? value)}</strong>
    </div>
  );
}

function DocSlot({
  label,
  docs,
  onAttach,
  onDelete,
  onPreview,
}: {
  label: string;
  docs?: DocumentItem[];
  onAttach: () => void;
  onDelete?: (documentId: string) => void;
  onPreview?: (document: DocumentItem) => void;
}) {
  return (
    <div className="record-info-field">
      <span>{label}</span>
      <strong className="record-doc-links">
        {docs?.length ? docs.map((doc) => <DocumentLink key={doc.id} doc={doc} onDelete={onDelete} onPreview={onPreview} />) : "—"}
        <button type="button" className="zoho-small-btn" onClick={onAttach}>Adjuntar</button>
      </strong>
    </div>
  );
}

function DocumentMatrix({
  documentsByCategory,
  onAttach,
  onDelete,
  onPreview,
}: {
  documentsByCategory: Record<string, DocumentItem[]>;
  onAttach: (category: string) => void;
  onDelete?: (documentId: string) => void;
  onPreview?: (document: DocumentItem) => void;
}) {
  return (
    <div className="record-doc-matrix">
      {documentCategories.map((category) => {
        const docs = getDocumentsForCategory(documentsByCategory, category);
        return (
          <div className="record-doc-slot" key={category}>
            <div className="record-doc-title"><strong>{category}</strong><button className="zoho-small-btn" onClick={() => onAttach(category)}>Adjuntar</button></div>
            {docs.length === 0 ? <span className="record-doc-empty">Sin archivo</span> : docs.map((doc) => <DocumentLink key={doc.id} doc={doc} onDelete={onDelete} onPreview={onPreview} />)}
          </div>
        );
      })}
    </div>
  );
}

function DocumentLink({
  doc,
  onDelete,
  onPreview,
}: {
  doc: DocumentItem;
  onDelete?: (documentId: string) => void;
  onPreview?: (document: DocumentItem) => void;
}) {
  const label = doc.file_name || doc.category || "Documento";
  const url = getDocumentUrl(doc);
  return (
    <span className="record-doc-link-row">
      <button
        type="button"
        className="record-doc-preview"
        title="Vista previa"
        disabled={!url}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onPreview ? onPreview(doc) : window.open(url, "_blank", "noopener,noreferrer");
        }}
      >
        Ver
      </button>
      {url ? <a href={url} target="_blank" rel="noreferrer">{label}</a> : <span>{label}</span>}
      {url && <a className="record-doc-download" href={url} download onClick={(event) => event.stopPropagation()}>Descargar</a>}
      {onDelete && (
        <button
          type="button"
          className="record-doc-delete"
          title="Eliminar documento"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(doc.id);
          }}
        >
          Eliminar
        </button>
      )}
    </span>
  );
}
