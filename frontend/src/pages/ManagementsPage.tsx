import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, publicBaseUrl, uploadForm } from "../api";
import type { ManagementDocument } from "../types";

type ManagementDetail = {
  id: string;
  management_type?: string | null;
  razon_social?: string | null;
  rut?: string | null;
  entidad?: string | null;
  estado_gestion?: string | null;
  numero_solicitud?: string | null;
  envio_afp?: string | null;
  estado_contrato_cliente?: string | null;
  estado_trabajador?: string | null;
  motivo_tipo_exceso?: string | null;
  motivo_rechazo?: string | null;
  mes_produccion_2026?: string | null;
  acceso_portal?: string | null;
  banco?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  confirmacion_cc?: boolean | null;
  confirmacion_poder?: boolean | null;
  consulta_cen?: string | null;
  contenido_cen?: string | null;
  respuesta_cen?: string | null;
  monto_devolucion?: number | null;
  monto_pagado?: number | null;
  monto_cliente?: number | null;
  fee?: number | null;
  monto_finanfix_solutions?: number | null;
  facturado_finanfix?: string | null;
  facturado_cliente?: string | null;
  numero_factura?: string | null;
  numero_oc?: string | null;
  comment?: string | null;
  mandante?: { name: string } | null;
  company?: { razon_social: string; rut?: string | null } | null;
  lineAfp?: { afp_name: string } | null;
};

const stages = [
  {
    key: "presentacion",
    title: "1. Documentos de presentación",
    description: "Archivos usados para preparar y presentar la gestión.",
    categories: ["Carta explicativa", "Archivo AFP", "Poder", "Archivo respuesta CEN"],
  },
  {
    key: "pago",
    title: "2. Documentos de respuesta / pago",
    description: "Archivos recibidos cuando la entidad responde o paga.",
    categories: ["Comprobante pago", "Detalle de pago", "Comprobante rechazo"],
  },
  {
    key: "facturacion",
    title: "3. Documentos de facturación",
    description: "Documentos comerciales de cierre de la gestión.",
    categories: ["Factura", "OC"],
  },
  {
    key: "otros",
    title: "4. Otros documentos",
    description: "Otros respaldos asociados a la gestión.",
    categories: ["Otro"],
  },
];

const allCategories = stages.flatMap((stage) => stage.categories);

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function valueOrDash(value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

export default function ManagementDocumentsPage() {
  const { managementId = "" } = useParams();
  const navigate = useNavigate();

  const [management, setManagement] = useState<ManagementDetail | null>(null);
  const [documents, setDocuments] = useState<ManagementDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("Carta explicativa");
  const [file, setFile] = useState<File | null>(null);

  async function loadData() {
    setLoading(true);

    try {
      const [managementData, documentData] = await Promise.all([
        fetchJson<ManagementDetail>(`/managements/${managementId}`),
        fetchJson<ManagementDocument[]>("/management-documents", {
          query: { management_id: managementId },
        }),
      ]);

      setManagement(managementData);
      setDocuments(documentData);
    } catch (error) {
      console.error(error);
      alert("No se pudo cargar la ficha de gestión.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (managementId) loadData();
  }, [managementId]);

  async function uploadDocument() {
    if (!managementId) {
      alert("No se encontró la gestión.");
      return;
    }

    if (!file) {
      alert("Debes seleccionar un archivo.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("management_id", managementId);
      formData.append("category", category);
      formData.append("file", file);

      await uploadForm<ManagementDocument>("/management-documents/upload", formData);

      setModalOpen(false);
      setFile(null);
      setCategory("Carta explicativa");
      await loadData();
    } catch (error) {
      console.error(error);
      alert("No se pudo subir el documento.");
    } finally {
      setSaving(false);
    }
  }

  const documentsByCategory = useMemo(() => {
    return documents.reduce<Record<string, ManagementDocument[]>>((acc, doc) => {
      const key = doc.category || "Otro";
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    }, {});
  }, [documents]);

  if (loading) {
    return <div className="zoho-empty">Cargando ficha...</div>;
  }

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Ficha de Gestión</h1>
          <p>
            {management?.razon_social || "Sin razón social"} ·{" "}
            {management?.rut || "Sin RUT"} · {management?.lineAfp?.afp_name || "Sin AFP"}
          </p>
        </div>

        <div className="zoho-module-actions">
          <button className="zoho-btn" onClick={() => navigate("/managements")}>
            Volver a gestiones
          </button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>
            Adjuntar documento
          </button>
        </div>
      </div>

      <section className="zoho-detail-card">
        <div className="zoho-detail-title">
          <h2>Información principal</h2>
          <span className="zoho-status-pill">
            {management?.estado_gestion || "Sin estado"}
          </span>
        </div>

        <div className="zoho-detail-grid">
          <Info label="Tipo" value={management?.management_type} />
          <Info label="Mandante" value={management?.mandante?.name} />
          <Info label="Razón Social" value={management?.razon_social} />
          <Info label="RUT" value={management?.rut} />
          <Info label="AFP" value={management?.lineAfp?.afp_name} />
          <Info label="Entidad" value={management?.entidad} />
          <Info label="N° Solicitud" value={management?.numero_solicitud} />
          <Info label="Envío AFP" value={management?.envio_afp} />
          <Info label="Estado contrato cliente" value={management?.estado_contrato_cliente} />
          <Info label="Estado trabajador" value={management?.estado_trabajador} />
          <Info label="Acceso portal" value={management?.acceso_portal} />
          <Info label="Mes producción" value={management?.mes_produccion_2026} />
        </div>
      </section>

      <section className="zoho-detail-card">
        <div className="zoho-detail-title">
          <h2>Datos bancarios y CEN</h2>
        </div>

        <div className="zoho-detail-grid">
          <Info label="Banco" value={management?.banco} />
          <Info label="Tipo cuenta" value={management?.tipo_cuenta} />
          <Info label="Número cuenta" value={management?.numero_cuenta} />
          <Info label="Confirmación CC" value={management?.confirmacion_cc} />
          <Info label="Confirmación Poder" value={management?.confirmacion_poder} />
          <Info label="Consulta CEN" value={management?.consulta_cen} />
          <Info label="Contenido CEN" value={management?.contenido_cen} />
          <Info label="Respuesta CEN" value={management?.respuesta_cen} />
          <Info label="Motivo exceso" value={management?.motivo_tipo_exceso} />
          <Info label="Motivo rechazo/anulación" value={management?.motivo_rechazo} />
        </div>
      </section>

      <section className="zoho-detail-card">
        <div className="zoho-detail-title">
          <h2>Montos y facturación</h2>
        </div>

        <div className="zoho-detail-grid">
          <Info label="FEE" value={management?.fee} />
          <Info label="Monto devolución" value={formatMoney(management?.monto_devolucion)} />
          <Info label="Monto real pagado" value={formatMoney(management?.monto_pagado)} />
          <Info label="Monto cliente" value={formatMoney(management?.monto_cliente)} />
          <Info label="Monto Finanfix" value={formatMoney(management?.monto_finanfix_solutions)} />
          <Info label="Facturado cliente" value={management?.facturado_cliente} />
          <Info label="Facturado Finanfix" value={management?.facturado_finanfix} />
          <Info label="N° Factura" value={management?.numero_factura} />
          <Info label="N° OC" value={management?.numero_oc} />
        </div>
      </section>

      <section className="zoho-detail-card">
        <div className="zoho-detail-title">
          <h2>Documentación por etapa</h2>
          <span>{documents.length} documento(s)</span>
        </div>

        <div className="zoho-doc-stage-list">
          {stages.map((stage) => (
            <div key={stage.key} className="zoho-doc-stage">
              <div className="zoho-doc-stage-header">
                <div>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </div>
              </div>

              <div className="zoho-doc-grid">
                {stage.categories.map((cat) => {
                  const docs = documentsByCategory[cat] || [];

                  return (
                    <div key={cat} className="zoho-doc-slot">
                      <div className="zoho-doc-slot-title">
                        <strong>{cat}</strong>
                        <button
                          className="zoho-small-btn"
                          onClick={() => {
                            setCategory(cat);
                            setModalOpen(true);
                          }}
                        >
                          Adjuntar
                        </button>
                      </div>

                      {docs.length === 0 ? (
                        <div className="zoho-doc-empty">Sin archivo</div>
                      ) : (
                        docs.map((doc) => (
                          <a
                            key={doc.id}
                            className="zoho-doc-link"
                            href={`${publicBaseUrl}${doc.file_url}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {doc.file_name}
                          </a>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <ZohoModal
        title="Adjuntar documento a gestión"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="zoho-form-grid">
          <div className="zoho-form-field">
            <label>Tipo de documento</label>
            <select
              className="zoho-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {allCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="zoho-form-field">
            <label>Archivo</label>
            <input
              className="zoho-input"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>
            Cancelar
          </button>
          <button className="zoho-btn zoho-btn-primary" onClick={uploadDocument} disabled={saving}>
            {saving ? "Subiendo..." : "Subir documento"}
          </button>
        </div>
      </ZohoModal>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div className="zoho-info-field">
      <span>{label}</span>
      <strong>{valueOrDash(value)}</strong>
    </div>
  );
}