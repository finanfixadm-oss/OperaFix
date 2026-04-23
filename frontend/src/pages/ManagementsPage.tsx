import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";
import type {
  FilterFieldDefinition,
  FilterRule,
  Management,
  ManagementLineAfp,
} from "../types";

function getValueByPath(obj: unknown, path: string) {
  return path.split(".").reduce<any>((acc, key) => acc?.[key], obj);
}

function matchRule(value: unknown, rule: FilterRule) {
  const normalized = String(value ?? "").toLowerCase();
  const query = String(rule.value ?? "").toLowerCase();

  switch (rule.operator) {
    case "equals":
      return normalized === query;
    case "not_equals":
      return normalized !== query;
    case "contains":
      return normalized.includes(query);
    case "not_contains":
      return !normalized.includes(query);
    case "starts_with":
      return normalized.startsWith(query);
    case "ends_with":
      return normalized.endsWith(query);
    case "includes_all":
      return query.split(",").map((x) => x.trim()).filter(Boolean).every((p) => normalized.includes(p));
    case "includes_any":
      return query.split(",").map((x) => x.trim()).filter(Boolean).some((p) => normalized.includes(p));
    default:
      return true;
  }
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

const emptyForm = {
  management_type: "LM",
  owner_name: "",
  razon_social: "",
  rut: "",
  entidad: "",
  estado_gestion: "",
  numero_solicitud: "",
  envio_afp: "",
  estado_contrato_cliente: "",
  estado_trabajador: "",
  motivo_tipo_exceso: "",
  motivo_rechazo: "",
  mes_produccion_2026: "",
  grupo_empresa: "",
  acceso_portal: "",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
  confirmacion_cc: "false",
  confirmacion_poder: "false",
  consulta_cen: "",
  contenido_cen: "",
  respuesta_cen: "",
  monto_devolucion: "",
  monto_pagado: "",
  monto_cliente: "",
  fee: "",
  monto_finanfix_solutions: "",
  facturado_finanfix: "",
  facturado_cliente: "",
  numero_factura: "",
  numero_oc: "",
  comment: "",
};

export default function ManagementsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const lineAfpId = params.get("line_afp_id") || "";

  const [rows, setRows] = useState<Management[]>([]);
  const [afp, setAfp] = useState<ManagementLineAfp | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadRows() {
    setLoading(true);
    fetchJson<Management[]>("/managements", {
      query: { line_afp_id: lineAfpId || undefined },
    })
      .then(setRows)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRows();

    if (lineAfpId) {
      fetchJson<ManagementLineAfp>(`/management-line-afps/${lineAfpId}`)
        .then(setAfp)
        .catch(() => setAfp(null));
    }
  }, [lineAfpId]);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createManagement() {
    if (!lineAfpId || !afp?.line) {
      alert("No se encontró la AFP o la línea asociada.");
      return;
    }

    if (!form.razon_social.trim() || !form.rut.trim()) {
      alert("Razón social y RUT son obligatorios.");
      return;
    }

    setSaving(true);

    try {
      await postJson<Management>("/managements", {
        mandante_id: afp.line.mandante?.id,
        group_id: afp.line.group?.id || null,
        company_id: afp.line.company?.id,
        line_id: afp.line.id,
        line_afp_id: lineAfpId,

        ...form,
        confirmacion_cc: form.confirmacion_cc === "true",
        confirmacion_poder: form.confirmacion_poder === "true",
      });

      setModalOpen(false);
      setForm(emptyForm);
      await loadRows();
    } catch (error) {
      console.error(error);
      alert("No se pudo crear la gestión.");
    } finally {
      setSaving(false);
    }
  }

  const fields: FilterFieldDefinition[] = [
    { field: "management_type", label: "Tipo", type: "select", options: [{ label: "LM", value: "LM" }, { label: "TP", value: "TP" }] },
    { field: "razon_social", label: "Razón social", type: "text" },
    { field: "rut", label: "RUT", type: "text" },
    { field: "entidad", label: "Entidad", type: "text" },
    { field: "estado_gestion", label: "Estado Gestión", type: "text" },
    { field: "numero_solicitud", label: "N° Solicitud", type: "text" },
    { field: "banco", label: "Banco", type: "text" },
    { field: "confirmacion_cc", label: "Confirmación CC", type: "boolean" },
    { field: "confirmacion_poder", label: "Confirmación Poder", type: "boolean" },
    { field: "mandante.name", label: "Mandante", type: "text" },
    { field: "company.razon_social", label: "Empresa", type: "text" },
    { field: "lineAfp.afp_name", label: "AFP", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        [row.razon_social, row.rut, row.entidad, row.estado_gestion, row.numero_solicitud, row.lineAfp?.afp_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeRules.length) {
      data = data.filter((row) =>
        activeRules.every((rule) => matchRule(getValueByPath(row, rule.field), rule))
      );
    }

    return data;
  }, [rows, activeRules, quickSearch]);

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Gestiones</h1>
          <p>AFP → Gestión → Documentos por gestión</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>
            Nueva gestión
          </button>
          <button className="zoho-btn">Importar</button>
          <button className="zoho-btn">Exportar</button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar Gestiones"
          fields={fields}
          onApply={(rules, search) => {
            setActiveRules(rules);
            setQuickSearch(search);
          }}
        />

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filteredRows.length}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando...</div>
          ) : (
            <table className="zoho-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Razón social</th>
                  <th>RUT</th>
                  <th>AFP</th>
                  <th>Entidad</th>
                  <th>Estado Gestión</th>
                  <th>N° Solicitud</th>
                  <th>Monto devolución</th>
                  <th>Monto pagado</th>
                  <th>Banco</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/managements/${row.id}/documents`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{row.management_type}</td>
                    <td>{row.razon_social || "—"}</td>
                    <td>{row.rut || "—"}</td>
                    <td>{row.lineAfp?.afp_name || "—"}</td>
                    <td>{row.entidad || "—"}</td>
                    <td>{row.estado_gestion || "—"}</td>
                    <td>{row.numero_solicitud || "—"}</td>
                    <td>{formatMoney(row.monto_devolucion)}</td>
                    <td>{formatMoney(row.monto_pagado)}</td>
                    <td>{row.banco || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <ZohoModal
        title="Crear Gestión"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="zoho-form-section">
          <h3>1. Ingreso de caso</h3>
          <div className="zoho-form-grid">
            <Field label="Tipo">
              <select className="zoho-select" value={form.management_type} onChange={(e) => updateForm("management_type", e.target.value)}>
                <option value="LM">LM</option>
                <option value="TP">TP</option>
              </select>
            </Field>

            <Field label="Mes de producción">
              <input className="zoho-input" value={form.mes_produccion_2026} onChange={(e) => updateForm("mes_produccion_2026", e.target.value)} />
            </Field>

            <Field label="Acceso portal">
              <input className="zoho-input" value={form.acceso_portal} onChange={(e) => updateForm("acceso_portal", e.target.value)} />
            </Field>

            <Field label="Envío AFP">
              <input className="zoho-input" value={form.envio_afp} onChange={(e) => updateForm("envio_afp", e.target.value)} />
            </Field>

            <Field label="Estado contrato con cliente">
              <input className="zoho-input" value={form.estado_contrato_cliente} onChange={(e) => updateForm("estado_contrato_cliente", e.target.value)} />
            </Field>

            <Field label="Estado Gestión">
              <input className="zoho-input" value={form.estado_gestion} onChange={(e) => updateForm("estado_gestion", e.target.value)} />
            </Field>

            <Field label="N° Solicitud">
              <input className="zoho-input" value={form.numero_solicitud} onChange={(e) => updateForm("numero_solicitud", e.target.value)} />
            </Field>

            <Field label="Motivo del rechazo/anulación">
              <input className="zoho-input" value={form.motivo_rechazo} onChange={(e) => updateForm("motivo_rechazo", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>2. Datos identificatorios y bancarios</h3>
          <div className="zoho-form-grid">
            <Field label="Razón Social">
              <input className="zoho-input" value={form.razon_social} onChange={(e) => updateForm("razon_social", e.target.value)} />
            </Field>

            <Field label="RUT">
              <input className="zoho-input" value={form.rut} onChange={(e) => updateForm("rut", e.target.value)} />
            </Field>

            <Field label="Entidad">
              <input className="zoho-input" value={form.entidad} onChange={(e) => updateForm("entidad", e.target.value)} />
            </Field>

            <Field label="FEE">
              <input className="zoho-input" value={form.fee} onChange={(e) => updateForm("fee", e.target.value)} />
            </Field>

            <Field label="Banco">
              <input className="zoho-input" value={form.banco} onChange={(e) => updateForm("banco", e.target.value)} />
            </Field>

            <Field label="Tipo de Cuenta">
              <input className="zoho-input" value={form.tipo_cuenta} onChange={(e) => updateForm("tipo_cuenta", e.target.value)} />
            </Field>

            <Field label="Número cuenta">
              <input className="zoho-input" value={form.numero_cuenta} onChange={(e) => updateForm("numero_cuenta", e.target.value)} />
            </Field>

            <Field label="Confirmación CC">
              <select className="zoho-select" value={form.confirmacion_cc} onChange={(e) => updateForm("confirmacion_cc", e.target.value)}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </Field>

            <Field label="Confirmación Poder">
              <select className="zoho-select" value={form.confirmacion_poder} onChange={(e) => updateForm("confirmacion_poder", e.target.value)}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>3. CEN y trabajador</h3>
          <div className="zoho-form-grid">
            <Field label="Consulta CEN">
              <input className="zoho-input" value={form.consulta_cen} onChange={(e) => updateForm("consulta_cen", e.target.value)} />
            </Field>

            <Field label="Contenido CEN">
              <input className="zoho-input" value={form.contenido_cen} onChange={(e) => updateForm("contenido_cen", e.target.value)} />
            </Field>

            <Field label="Respuesta CEN">
              <input className="zoho-input" value={form.respuesta_cen} onChange={(e) => updateForm("respuesta_cen", e.target.value)} />
            </Field>

            <Field label="Estado Trabajador">
              <input className="zoho-input" value={form.estado_trabajador} onChange={(e) => updateForm("estado_trabajador", e.target.value)} />
            </Field>

            <Field label="Motivo (Tipo de exceso)">
              <input className="zoho-input" value={form.motivo_tipo_exceso} onChange={(e) => updateForm("motivo_tipo_exceso", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>4. Montos y facturación</h3>
          <div className="zoho-form-grid">
            <Field label="Monto Devolución">
              <input className="zoho-input" value={form.monto_devolucion} onChange={(e) => updateForm("monto_devolucion", e.target.value)} />
            </Field>

            <Field label="Monto Real Pagado">
              <input className="zoho-input" value={form.monto_pagado} onChange={(e) => updateForm("monto_pagado", e.target.value)} />
            </Field>

            <Field label="Monto Cliente">
              <input className="zoho-input" value={form.monto_cliente} onChange={(e) => updateForm("monto_cliente", e.target.value)} />
            </Field>

            <Field label="Monto Finanfix">
              <input className="zoho-input" value={form.monto_finanfix_solutions} onChange={(e) => updateForm("monto_finanfix_solutions", e.target.value)} />
            </Field>

            <Field label="Facturado cliente">
              <input className="zoho-input" value={form.facturado_cliente} onChange={(e) => updateForm("facturado_cliente", e.target.value)} />
            </Field>

            <Field label="Facturado Finanfix">
              <input className="zoho-input" value={form.facturado_finanfix} onChange={(e) => updateForm("facturado_finanfix", e.target.value)} />
            </Field>

            <Field label="N° Factura">
              <input className="zoho-input" value={form.numero_factura} onChange={(e) => updateForm("numero_factura", e.target.value)} />
            </Field>

            <Field label="N° OC">
              <input className="zoho-input" value={form.numero_oc} onChange={(e) => updateForm("numero_oc", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>5. Comentarios</h3>
          <textarea className="zoho-input zoho-textarea" value={form.comment} onChange={(e) => updateForm("comment", e.target.value)} />
        </div>

        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>
            Cancelar
          </button>
          <button className="zoho-btn zoho-btn-primary" onClick={createManagement} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Gestión"}
          </button>
        </div>
      </ZohoModal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="zoho-form-field">
      <label>{label}</label>
      {children}
    </div>
  );
}