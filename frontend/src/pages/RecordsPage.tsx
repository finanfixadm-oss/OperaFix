import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";
import type { FilterFieldDefinition, FilterRule } from "../types";
import type { RecordItem } from "../types-records";

type MandanteOption = {
  id: string;
  name: string;
  owner_name?: string | null;
  email?: string | null;
  _count?: { managements?: number; companies?: number; groups?: number };
};

type FormState = {
  mandante_id: string;
  management_type: string;
  owner_name: string;
  razon_social: string;
  rut: string;
  entidad: string;
  estado_gestion: string;
  numero_solicitud: string;
  envio_afp: string;
  estado_contrato_cliente: string;
  fecha_termino_contrato: string;
  estado_trabajador: string;
  motivo_tipo_exceso: string;
  motivo_rechazo: string;
  fecha_rechazo: string;
  mes_produccion_2026: string;
  grupo_empresa: string;
  acceso_portal: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  confirmacion_cc: string;
  confirmacion_poder: string;
  consulta_cen: string;
  contenido_cen: string;
  respuesta_cen: string;
  fecha_presentacion_afp: string;
  fecha_ingreso_afp: string;
  fecha_pago_afp: string;
  monto_devolucion: string;
  monto_pagado: string;
  monto_cliente: string;
  fee: string;
  monto_finanfix_solutions: string;
  facturado_finanfix: string;
  facturado_cliente: string;
  fecha_factura_finanfix: string;
  fecha_pago_factura_finanfix: string;
  numero_factura: string;
  numero_oc: string;
  comment: string;
};

const emptyForm: FormState = {
  mandante_id: "",
  management_type: "LM",
  owner_name: "",
  razon_social: "",
  rut: "",
  entidad: "",
  estado_gestion: "Pendiente Gestión",
  numero_solicitud: "",
  envio_afp: "Pendiente",
  estado_contrato_cliente: "",
  fecha_termino_contrato: "",
  estado_trabajador: "",
  motivo_tipo_exceso: "",
  motivo_rechazo: "",
  fecha_rechazo: "",
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
  fecha_presentacion_afp: "",
  fecha_ingreso_afp: "",
  fecha_pago_afp: "",
  monto_devolucion: "",
  monto_pagado: "",
  monto_cliente: "",
  fee: "",
  monto_finanfix_solutions: "",
  facturado_finanfix: "",
  facturado_cliente: "",
  fecha_factura_finanfix: "",
  fecha_pago_factura_finanfix: "",
  numero_factura: "",
  numero_oc: "",
  comment: "",
};

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
      return query.split(",").map((x) => x.trim()).filter(Boolean).every((part) => normalized.includes(part));
    case "includes_any":
      return query.split(",").map((x) => x.trim()).filter(Boolean).some((part) => normalized.includes(part));
    default:
      return true;
  }
}

function formatMoney(value?: number | string | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function boolLabel(value?: boolean | null) {
  if (value === undefined || value === null) return "—";
  return value ? "Sí" : "No";
}

export default function RecordsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecordItem[]>([]);
  const [mandantes, setMandantes] = useState<MandanteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [activeMandanteId, setActiveMandanteId] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadRows() {
    setLoading(true);
    try {
      const data = await fetchJson<RecordItem[]>("/records");
      setRows(data);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar los registros de empresas.");
    } finally {
      setLoading(false);
    }
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
    loadRows();
    loadMandantes();
  }, []);

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createRecord() {
    if (!form.mandante_id) {
      alert("Debes seleccionar el mandante del registro.");
      return;
    }

    if (!form.razon_social.trim()) {
      alert("Debes ingresar Razón Social.");
      return;
    }

    if (!form.rut.trim()) {
      alert("Debes ingresar RUT.");
      return;
    }

    setSaving(true);
    try {
      await postJson<RecordItem>("/records", {
        ...form,
        mandante_id: form.mandante_id,
        confirmacion_cc: form.confirmacion_cc === "true",
        confirmacion_poder: form.confirmacion_poder === "true",
      });

      setModalOpen(false);
      setForm(emptyForm);
      await Promise.all([loadRows(), loadMandantes()]);
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el registro de empresa.");
    } finally {
      setSaving(false);
    }
  }

  const fields: FilterFieldDefinition[] = [
    { field: "mandante.name", label: "Mandante", type: "text" },
    { field: "entidad", label: "Entidad", type: "text" },
    { field: "grupo_empresa", label: "Buscar Grupo", type: "text" },
    { field: "confirmacion_cc", label: "Confirmación CC", type: "boolean" },
    { field: "rut", label: "RUT", type: "text" },
    { field: "estado_gestion", label: "Estado Gestión", type: "text" },
    { field: "monto_devolucion", label: "Monto Devolución", type: "number" },
    { field: "razon_social", label: "Razón Social", type: "text" },
    { field: "numero_solicitud", label: "N° Solicitud", type: "text" },
    { field: "mes_produccion_2026", label: "Mes de producción", type: "text" },
    { field: "management_type", label: "Tipo", type: "select", options: [{ label: "LM", value: "LM" }, { label: "TP", value: "TP" }] },
    { field: "lineAfp.afp_name", label: "AFP", type: "text" },
    { field: "acceso_portal", label: "Acceso portal", type: "text" },
    { field: "banco", label: "Banco", type: "text" },
    { field: "tipo_cuenta", label: "Tipo de Cuenta", type: "text" },
    { field: "numero_cuenta", label: "Número cuenta", type: "text" },
    { field: "confirmacion_poder", label: "Confirmación Poder", type: "boolean" },
    { field: "consulta_cen", label: "Consulta CEN", type: "text" },
    { field: "respuesta_cen", label: "Respuesta CEN", type: "text" },
    { field: "estado_trabajador", label: "Estado Trabajador", type: "text" },
    { field: "facturado_cliente", label: "Facturado cliente", type: "text" },
    { field: "facturado_finanfix", label: "Facturado Finanfix", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (activeMandanteId !== "todos") {
      data = data.filter((row) => row.mandante?.id === activeMandanteId);
    }

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        [
          row.mandante?.name,
          row.entidad,
          row.grupo_empresa,
          row.rut,
          row.estado_gestion,
          row.razon_social,
          row.numero_solicitud,
          row.mes_produccion_2026,
          row.company?.razon_social,
          row.lineAfp?.afp_name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeRules.length) {
      data = data.filter((row) => activeRules.every((rule) => matchRule(getValueByPath(row, rule.field), rule)));
    }

    return data;
  }, [rows, activeRules, quickSearch, activeMandanteId]);

  const quickTabs = useMemo(() => {
    const base = mandantes.slice(0, 6).map((item) => ({ id: item.id, label: item.name }));
    return [{ id: "todos", label: "Todos los registros" }, ...base];
  }, [mandantes]);

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Registros de empresas</h1>
          <p>Lista de líneas/casos de gestión por empresa, AFP y mandante</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn">Filtrar</button>
          <button className="zoho-btn">Ordenar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>
            Crear Registro de empresa
          </button>
        </div>
      </div>

      <div className="zoho-view-tabs">
        {quickTabs.map((tab) => (
          <button key={tab.id} className={activeMandanteId === tab.id ? "active" : ""} onClick={() => setActiveMandanteId(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="zoho-module-layout">
        <ModuleFilterPanel
          title="Filtrar Registros de empresas"
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
                  <th><input type="checkbox" /></th>
                  <th>Mandante</th>
                  <th>Entidad</th>
                  <th>Buscar Grupo</th>
                  <th>Confirmación CC</th>
                  <th>RUT</th>
                  <th>Estado Gestión</th>
                  <th>Monto Devolución</th>
                  <th>Razón Social</th>
                  <th>N° Solicitud</th>
                  <th>Mes producción</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11}>Sin registros creados.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td><input type="checkbox" /></td>
                      <td>{row.mandante?.name || "—"}</td>
                      <td className="zoho-link-cell" onClick={() => navigate(`/records/${row.id}`)}>
                        {row.entidad || row.lineAfp?.afp_name || "—"}
                      </td>
                      <td>{row.grupo_empresa || row.group?.name || "—"}</td>
                      <td>{boolLabel(row.confirmacion_cc)}</td>
                      <td>{row.rut || row.company?.rut || "—"}</td>
                      <td>{row.estado_gestion || "—"}</td>
                      <td>{formatMoney(row.monto_devolucion)}</td>
                      <td className="zoho-link-cell" onClick={() => navigate(`/records/${row.id}`)}>
                        {row.razon_social || row.company?.razon_social || "—"}
                      </td>
                      <td>{row.numero_solicitud || "—"}</td>
                      <td>{row.mes_produccion_2026 || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <ZohoModal title="Crear Registro de empresa" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="zoho-form-section">
          <h3>0. Mandante del registro</h3>
          <div className="zoho-form-grid">
            <Field label="Mandante">
              <select className="zoho-select" value={form.mandante_id} onChange={(e) => updateForm("mandante_id", e.target.value)}>
                <option value="">Seleccionar mandante</option>
                {mandantes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Propietario de Registro">
              <input className="zoho-input" value={form.owner_name} onChange={(e) => updateForm("owner_name", e.target.value)} />
            </Field>
          </div>
        </div>

        <FormSection title="1. Datos empresa">
          <Field label="Razón Social"><input className="zoho-input" value={form.razon_social} onChange={(e) => updateForm("razon_social", e.target.value)} /></Field>
          <Field label="RUT"><input className="zoho-input" value={form.rut} onChange={(e) => updateForm("rut", e.target.value)} /></Field>
          <Field label="Buscar Grupo"><input className="zoho-input" value={form.grupo_empresa} onChange={(e) => updateForm("grupo_empresa", e.target.value)} /></Field>
          <Field label="Estado contrato con cliente"><input className="zoho-input" value={form.estado_contrato_cliente} onChange={(e) => updateForm("estado_contrato_cliente", e.target.value)} /></Field>
          <Field label="Fecha término contrato"><input className="zoho-input" type="date" value={form.fecha_termino_contrato} onChange={(e) => updateForm("fecha_termino_contrato", e.target.value)} /></Field>
          <Field label="Comentario"><input className="zoho-input" value={form.comment} onChange={(e) => updateForm("comment", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="2. Información de gestión">
          <Field label="Tipo"><select className="zoho-select" value={form.management_type} onChange={(e) => updateForm("management_type", e.target.value)}><option value="LM">LM</option><option value="TP">TP</option></select></Field>
          <Field label="Entidad (AFP)"><input className="zoho-input" value={form.entidad} onChange={(e) => updateForm("entidad", e.target.value)} /></Field>
          <Field label="Estado Gestión"><input className="zoho-input" value={form.estado_gestion} onChange={(e) => updateForm("estado_gestion", e.target.value)} /></Field>
          <Field label="N° Solicitud"><input className="zoho-input" value={form.numero_solicitud} onChange={(e) => updateForm("numero_solicitud", e.target.value)} /></Field>
          <Field label="Mes producción 2026"><input className="zoho-input" value={form.mes_produccion_2026} onChange={(e) => updateForm("mes_produccion_2026", e.target.value)} /></Field>
          <Field label="Motivo tipo exceso"><input className="zoho-input" value={form.motivo_tipo_exceso} onChange={(e) => updateForm("motivo_tipo_exceso", e.target.value)} /></Field>
          <Field label="Envío AFP"><input className="zoho-input" value={form.envio_afp} onChange={(e) => updateForm("envio_afp", e.target.value)} /></Field>
          <Field label="Acceso portal"><input className="zoho-input" value={form.acceso_portal} onChange={(e) => updateForm("acceso_portal", e.target.value)} /></Field>
          <Field label="Confirmación CC"><select className="zoho-select" value={form.confirmacion_cc} onChange={(e) => updateForm("confirmacion_cc", e.target.value)}><option value="false">No</option><option value="true">Sí</option></select></Field>
          <Field label="Confirmación Poder"><select className="zoho-select" value={form.confirmacion_poder} onChange={(e) => updateForm("confirmacion_poder", e.target.value)}><option value="false">No</option><option value="true">Sí</option></select></Field>
          <Field label="Consulta CEN"><input className="zoho-input" value={form.consulta_cen} onChange={(e) => updateForm("consulta_cen", e.target.value)} /></Field>
          <Field label="Contenido CEN"><input className="zoho-input" value={form.contenido_cen} onChange={(e) => updateForm("contenido_cen", e.target.value)} /></Field>
          <Field label="Respuesta CEN"><input className="zoho-input" value={form.respuesta_cen} onChange={(e) => updateForm("respuesta_cen", e.target.value)} /></Field>
          <Field label="Estado trabajador"><input className="zoho-input" value={form.estado_trabajador} onChange={(e) => updateForm("estado_trabajador", e.target.value)} /></Field>
          <Field label="Fecha presentación AFP"><input className="zoho-input" type="date" value={form.fecha_presentacion_afp} onChange={(e) => updateForm("fecha_presentacion_afp", e.target.value)} /></Field>
          <Field label="Fecha ingreso AFP"><input className="zoho-input" type="date" value={form.fecha_ingreso_afp} onChange={(e) => updateForm("fecha_ingreso_afp", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="3. Datos bancarios y rechazo">
          <Field label="Banco"><input className="zoho-input" value={form.banco} onChange={(e) => updateForm("banco", e.target.value)} /></Field>
          <Field label="Tipo Cuenta"><input className="zoho-input" value={form.tipo_cuenta} onChange={(e) => updateForm("tipo_cuenta", e.target.value)} /></Field>
          <Field label="Número cuenta"><input className="zoho-input" value={form.numero_cuenta} onChange={(e) => updateForm("numero_cuenta", e.target.value)} /></Field>
          <Field label="Fecha rechazo"><input className="zoho-input" type="date" value={form.fecha_rechazo} onChange={(e) => updateForm("fecha_rechazo", e.target.value)} /></Field>
          <Field label="Motivo rechazo/anulación"><input className="zoho-input" value={form.motivo_rechazo} onChange={(e) => updateForm("motivo_rechazo", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="4. Montos y facturación">
          <Field label="Monto Devolución"><input className="zoho-input" type="number" value={form.monto_devolucion} onChange={(e) => updateForm("monto_devolucion", e.target.value)} /></Field>
          <Field label="Monto Cliente"><input className="zoho-input" type="number" value={form.monto_cliente} onChange={(e) => updateForm("monto_cliente", e.target.value)} /></Field>
          <Field label="Monto Finanfix"><input className="zoho-input" type="number" value={form.monto_finanfix_solutions} onChange={(e) => updateForm("monto_finanfix_solutions", e.target.value)} /></Field>
          <Field label="Monto Real Pagado"><input className="zoho-input" type="number" value={form.monto_pagado} onChange={(e) => updateForm("monto_pagado", e.target.value)} /></Field>
          <Field label="FEE"><input className="zoho-input" type="number" value={form.fee} onChange={(e) => updateForm("fee", e.target.value)} /></Field>
          <Field label="Facturado Finanfix"><input className="zoho-input" value={form.facturado_finanfix} onChange={(e) => updateForm("facturado_finanfix", e.target.value)} /></Field>
          <Field label="Facturado Cliente"><input className="zoho-input" value={form.facturado_cliente} onChange={(e) => updateForm("facturado_cliente", e.target.value)} /></Field>
          <Field label="Fecha Pago AFP"><input className="zoho-input" type="date" value={form.fecha_pago_afp} onChange={(e) => updateForm("fecha_pago_afp", e.target.value)} /></Field>
          <Field label="Fecha Factura Finanfix"><input className="zoho-input" type="date" value={form.fecha_factura_finanfix} onChange={(e) => updateForm("fecha_factura_finanfix", e.target.value)} /></Field>
          <Field label="Fecha pago factura Finanfix"><input className="zoho-input" type="date" value={form.fecha_pago_factura_finanfix} onChange={(e) => updateForm("fecha_pago_factura_finanfix", e.target.value)} /></Field>
          <Field label="N° Factura"><input className="zoho-input" value={form.numero_factura} onChange={(e) => updateForm("numero_factura", e.target.value)} /></Field>
          <Field label="N° OC"><input className="zoho-input" value={form.numero_oc} onChange={(e) => updateForm("numero_oc", e.target.value)} /></Field>
        </FormSection>

        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={createRecord} disabled={saving}>{saving ? "Guardando..." : "Guardar Registro"}</button>
        </div>
      </ZohoModal>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="zoho-form-section"><h3>{title}</h3><div className="zoho-form-grid">{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="zoho-form-field"><label>{label}</label>{children}</div>;
}
