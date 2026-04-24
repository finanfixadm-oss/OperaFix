import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchJson, postJson, publicBaseUrl, uploadForm } from "../api";

type Doc = {
  id: string;
  category?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  created_at?: string | null;
};

type Activity = {
  id: string;
  activity_type?: string | null;
  description?: string | null;
  created_at?: string | null;
};

type Note = {
  id: string;
  content?: string | null;
  created_at?: string | null;
};

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
  monto_devolucion?: number | null;
  monto_cliente?: number | null;
  monto_finanfix_solutions?: number | null;
  monto_pagado?: number | null;
  monto_real_cliente?: number | null;
  fee?: number | null;
  monto_real_finanfix_solutions?: number | null;
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

const documentTypes = [
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

function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function money(value?: number | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function date(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-CL");
}

function normalizeCategory(category?: string | null) {
  // El /_/g busca todas las instancias de "_" y las cambia por " "
  return String(category || "").replace(/_/g, " ").toLowerCase();

}

export default function CompanyRecordDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RecordDetail | null>(null);
  const [tab, setTab] = useState("notas");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Poder");
  const [file, setFile] = useState<File | null>(null);

  async function fetchData() {
    const result = await fetchJson<RecordDetail>(`/records/${id}`);
    setData(result);
  }

  useEffect(() => {
    if (id) fetchData().catch(console.error);
  }, [id]);

  async function saveNote() {
    if (!note.trim()) return;
    await postJson(`/records/${id}/notes`, { content: note });
    setNote("");
    await fetchData();
  }

  async function uploadDocument() {
    if (!file) {
      alert("Selecciona un archivo.");
      return;
    }
    const fd = new FormData();
    fd.append("category", category);
    fd.append("file", file);
    await uploadForm(`/records/${id}/documents/upload`, fd);
    setFile(null);
    await fetchData();
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

  return (
    <div className="zoho-detail-page">
      <div className="zoho-record-header-card">
        <button className="zoho-btn" onClick={() => navigate("/records")}>←</button>
        <div className="zoho-logo-box">finanfix<br /><small>Solutions SpA</small></div>
        <div className="zoho-record-actions">
          <button className="zoho-btn zoho-btn-primary">Enviar correo electrónico</button>
          <button className="zoho-btn">Editar</button>
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
        {[
          ["notas", "NOTAS"],
          ["correos", "CORREOS"],
          ["cronologia", "CRONOLOGÍA"],
          ["archivos", "ARCHIVOS ADJUNTOS"],
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="zoho-tab-content-card">
        {tab === "notas" && (
          <div>
            <h3>Notas</h3>
            <select className="zoho-select zoho-small-select"><option>Recientes Última</option></select>
            <div className="zoho-note-row">
              <input className="zoho-input" placeholder="Agregar una nota" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="zoho-btn zoho-btn-primary" onClick={saveNote}>Guardar</button>
            </div>
            {(data.notes || []).map((item) => (
              <div className="zoho-timeline-item" key={item.id}>{item.content}</div>
            ))}
          </div>
        )}
        {tab === "correos" && <div className="zoho-mail-folders"><span>Enviados</span><span>Programados</span><span>Borradores</span></div>}
        {tab === "cronologia" && (data.activities || []).map((a) => <div className="zoho-timeline-item" key={a.id}>{a.description}</div>)}
        {tab === "archivos" && (data.documents || []).map((d) => <DocumentLink key={d.id} doc={d} />)}
      </div>

      <div className="zoho-detail-grid-cards">
        <Card title="DATOS EMPRESA">
          <Info label="Mandante" text={data.mandante?.name || data.mandante?.nombre} />
          <Info label="Estado contrato con cliente" text={data.estado_contrato_cliente} />
          <Info label="Fecha término de contrato" text={date(data.fecha_termino_contrato)} />
          <Info label="Buscar Grupo" text={data.grupo_empresa} />
          <Info label="Razón Social" text={companyName} />
          <Info label="RUT" text={data.rut || data.company?.rut} />
          <Info label="Dirección" text={data.direccion || data.company?.direccion} />
          <Info label="Comentario" text={data.comment} />
          <DocSlot label="Poder" docs={documentsByCategory["poder"]} />
        </Card>

        <Card title="DATOS BANCARIOS">
          <Info label="Banco" text={data.banco} />
          <Info label="Tipo de Cuenta" text={data.tipo_cuenta} />
          <Info label="Número cuenta" text={data.numero_cuenta} />
        </Card>

        <Card title="ANTECEDENTES RECHAZO">
          <Info label="Fecha Rechazo" text={date(data.fecha_rechazo)} />
          <DocSlot label="Comprobante rechazo" docs={documentsByCategory["comprobante rechazo"]} />
          <Info label="Motivo del rechazo/anulación" text={data.motivo_rechazo} />
        </Card>

        <Card title="INFORMACIÓN DE GESTIÓN">
          <Info label="Mes de producción 2026" text={data.mes_produccion_2026} />
          <Info label="Motivo (Tipo de exceso)" text={data.motivo_tipo_exceso} />
          <Info label="Confirmación Poder" text={value(data.confirmacion_poder)} />
          <Info label="Estado Gestión" text={data.estado_gestion} />
          <Info label="Consulta CEN" text={data.consulta_cen} />
          <Info label="Mes de ingreso solicitud" text={data.mes_ingreso_solicitud} />
          <Info label="Envío AFP" text={data.envio_afp} />
          <Info label="Confirmación CC" text={value(data.confirmacion_cc)} />
          <Info label="Fecha Presentación AFP" text={date(data.fecha_presentacion_afp)} />
          <Info label="Respuesta CEN" text={data.respuesta_cen} />
          <Info label="N° Solicitud" text={data.numero_solicitud} />
          <Info label="Entidad (AFP)" text={data.entidad || data.lineAfp?.afp_name} />
          <Info label="Acceso portal" text={data.acceso_portal} />
          <Info label="Fecha ingreso AFP" text={date(data.fecha_ingreso_afp)} />
          <Info label="Estado Trabajador" text={data.estado_trabajador} />
        </Card>

        <Card title="ARCHIVOS / RESPALDO">
          <DocSlot label="Carta explicativa" docs={documentsByCategory["carta explicativa"]} />
          <DocSlot label="Archivo AFP" docs={documentsByCategory["archivo afp"]} />
          <DocSlot label="Detalle de pago" docs={documentsByCategory["detalle trabajadores"] || documentsByCategory["detalle de pago"]} />
          <DocSlot label="Comprobante pago" docs={documentsByCategory["comprobante pago"]} />
          <DocSlot label="Archivo respuesta CEN" docs={documentsByCategory["respuesta cen"] || documentsByCategory["archivo respuesta cen"]} />
        </Card>

        <Card title="MONTOS RECUPERACIÓN">
          <Info label="Monto Devolución" text={money(data.monto_devolucion)} />
          <Info label="Monto cliente" text={money(data.monto_cliente)} />
          <Info label="Monto Finanfix" text={money(data.monto_finanfix_solutions)} />
          <Info label="Monto Real Pagado" text={money(data.monto_pagado)} />
          <Info label="Monto real cliente" text={money(data.monto_real_cliente)} />
          <Info label="FEE" text={value(data.fee)} />
          <Info label="Monto real Finanfix Solutions" text={money(data.monto_real_finanfix_solutions)} />
        </Card>

        <Card title="DATOS FACTURACIÓN">
          <Info label="Facturado Finanfix" text={data.facturado_finanfix} />
          <Info label="Facturado cliente" text={data.facturado_cliente} />
          <Info label="Fecha Pago AFP" text={date(data.fecha_pago_afp)} />
          <Info label="Fecha Factura Finanfix" text={date(data.fecha_factura_finanfix)} />
          <Info label="Fecha pago factura Finanfix" text={date(data.fecha_pago_factura_finanfix)} />
          <Info label="Fecha notificación cliente" text={date(data.fecha_notificacion_cliente)} />
          <Info label="N° Factura" text={data.numero_factura} />
          <Info label="N° OC" text={data.numero_oc} />
          <DocSlot label="Factura" docs={documentsByCategory["factura"]} />
          <DocSlot label="OC" docs={documentsByCategory["orden compra"] || documentsByCategory["oc"]} />
        </Card>
      </div>

      <div className="zoho-upload-card">
        <h3>Adjuntar documento al registro</h3>
        <select className="zoho-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {documentTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
        <input className="zoho-input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="zoho-btn zoho-btn-primary" onClick={uploadDocument}>Subir documento</button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="zoho-info-card"><h3>{title}</h3>{children}</section>;
}

function Info({ label, text }: { label: string; text: unknown }) {
  return <div className="zoho-info-line"><span>{label}</span><strong>{value(text)}</strong></div>;
}

function DocSlot({ label, docs }: { label: string; docs?: Doc[] }) {
  return (
    <div className="zoho-info-line">
      <span>{label}</span>
      <strong>{docs?.length ? docs.map((doc) => <DocumentLink key={doc.id} doc={doc} />) : "—"}</strong>
    </div>
  );
}

function DocumentLink({ doc }: { doc: Doc }) {
  if (!doc.file_url) return <span>{doc.file_name || doc.category || "Documento"}</span>;
  return <a href={`${publicBaseUrl}${doc.file_url}`} target="_blank" rel="noreferrer">{doc.file_name || doc.category}</a>;
}
