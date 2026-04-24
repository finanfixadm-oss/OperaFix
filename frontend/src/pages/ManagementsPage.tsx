import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";
import type {
  FilterFieldDefinition,
  FilterRule,
  ManagementLineAfp,
} from "../types";

type Management = {
  id: string;
  management_type?: string | null;
  owner_name?: string | null;

  mandante_id?: string | null;
  group_id?: string | null;
  company_id?: string | null;
  line_id?: string | null;
  line_afp_id?: string | null;

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
  grupo_empresa?: string | null;
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

  mandante?: { id: string; name: string } | null;
  company?: { id: string; razon_social: string; rut?: string | null } | null;
  line?: {
    id: string;
    line_type?: string | null;
    mandante?: { id: string; name: string } | null;
    group?: { id: string; name: string } | null;
    company?: { id: string; razon_social: string; rut?: string | null } | null;
  } | null;
  lineAfp?: {
    id: string;
    afp_name: string;
    line?: ManagementLineAfp["line"];
  } | null;
};

const emptyForm = {
  line_afp_id: "",
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
      return query
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .every((part) => normalized.includes(part));
    case "includes_any":
      return query
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .some((part) => normalized.includes(part));
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

export default function ManagementsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lineAfpId = params.get("line_afp_id") || "";

  const [rows, setRows] = useState<Management[]>([]);
  const [afp, setAfp] = useState<ManagementLineAfp | null>(null);
  const [allAfps, setAllAfps] = useState<ManagementLineAfp[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const selectedAfp = useMemo(() => {
    if (lineAfpId && afp) return afp;
    if (!form.line_afp_id) return null;
    return allAfps.find((item) => item.id === form.line_afp_id) || null;
  }, [lineAfpId, afp, allAfps, form.line_afp_id]);

  async function loadRows() {
    setLoading(true);

    try {
      const data = await fetchJson<Management[]>("/managements", {
        query: { line_afp_id: lineAfpId || undefined },
      });
      setRows(data);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar las gestiones.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAfp() {
    if (!lineAfpId) {
      setAfp(null);
      return;
    }

    try {
      const data = await fetchJson<ManagementLineAfp>(
        `/management-line-afps/${lineAfpId}`
      );
      setAfp(data);
      setForm((prev) => ({ ...prev, line_afp_id: data.id }));
    } catch (error) {
      console.error(error);
      setAfp(null);
    }
  }

  async function loadAllAfps() {
    try {
      const data = await fetchJson<ManagementLineAfp[]>("/management-line-afps");
      setAllAfps(data);
    } catch (error) {
      console.error(error);
      setAllAfps([]);
    }
  }

  useEffect(() => {
    loadRows();
    loadAfp();
    loadAllAfps();
  }, [lineAfpId]);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createManagement() {
    const currentAfp = selectedAfp;
    const lineFromAfp = currentAfp?.line;

    const mandanteId =
      lineFromAfp?.mandante?.id ||
      rows[0]?.mandante_id ||
      rows[0]?.line?.mandante?.id ||
      "";

    const groupId =
      lineFromAfp?.group?.id ||
      rows[0]?.group_id ||
      rows[0]?.line?.group?.id ||
      null;

    const companyId =
      lineFromAfp?.company?.id ||
      rows[0]?.company_id ||
      rows[0]?.company?.id ||
      rows[0]?.line?.company?.id ||
      "";

    const lineId =
      lineFromAfp?.id ||
      rows[0]?.line_id ||
      rows[0]?.line?.id ||
      "";

    if (!currentAfp?.id) {
      alert("Debes seleccionar una AFP / línea para crear la gestión.");
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

    if (!mandanteId || !companyId || !lineId) {
      alert(
        "Falta contexto de Mandante / Empresa / Línea. Entra desde una línea o una AFP, o verifica que la AFP seleccionada tenga una línea asociada."
      );
      return;
    }

    setSaving(true);

    try {
      await postJson<Management>("/managements", {
        mandante_id: mandanteId,
        group_id: groupId,
        company_id: companyId,
        line_id: lineId,
        line_afp_id: currentAfp.id,

        management_type: form.management_type,
        owner_name: form.owner_name,
        razon_social: form.razon_social,
        rut: form.rut,
        entidad: form.entidad,
        estado_gestion: form.estado_gestion,
        numero_solicitud: form.numero_solicitud,

        envio_afp: form.envio_afp,
        estado_contrato_cliente: form.estado_contrato_cliente,
        estado_trabajador: form.estado_trabajador,
        motivo_tipo_exceso: form.motivo_tipo_exceso,
        motivo_rechazo: form.motivo_rechazo,
        mes_produccion_2026: form.mes_produccion_2026,
        grupo_empresa: form.grupo_empresa,
        acceso_portal: form.acceso_portal,

        banco: form.banco,
        tipo_cuenta: form.tipo_cuenta,
        numero_cuenta: form.numero_cuenta,
        confirmacion_cc: form.confirmacion_cc === "true",
        confirmacion_poder: form.confirmacion_poder === "true",

        consulta_cen: form.consulta_cen,
        contenido_cen: form.contenido_cen,
        respuesta_cen: form.respuesta_cen,

        monto_devolucion: form.monto_devolucion,
        monto_pagado: form.monto_pagado,
        monto_cliente: form.monto_cliente,
        fee: form.fee,
        monto_finanfix_solutions: form.monto_finanfix_solutions,

        facturado_finanfix: form.facturado_finanfix,
        facturado_cliente: form.facturado_cliente,
        numero_factura: form.numero_factura,
        numero_oc: form.numero_oc,

        comment: form.comment,
      });

      setModalOpen(false);
      setForm({
        ...emptyForm,
        line_afp_id: lineAfpId || "",
      });
      await loadRows();
    } catch (error) {
      console.error(error);
      alert("No se pudo crear la gestión.");
    } finally {
      setSaving(false);
    }
  }

  const fields: FilterFieldDefinition[] = [
    {
      field: "management_type",
      label: "Tipo",
      type: "select",
      options: [
        { label: "LM", value: "LM" },
        { label: "TP", value: "TP" },
      ],
    },
    { field: "mes_produccion_2026", label: "Mes de producción", type: "text" },
    { field: "acceso_portal", label: "Acceso portal", type: "text" },
    { field: "mandante.name", label: "Mandante", type: "text" },
    { field: "envio_afp", label: "Envío AFP", type: "text" },
    {
      field: "estado_contrato_cliente",
      label: "Estado contrato con cliente",
      type: "text",
    },
    { field: "comment", label: "Comentario", type: "text" },
    { field: "entidad", label: "Entidad", type: "text" },
    { field: "estado_gestion", label: "Estado Gestión", type: "text" },
    { field: "motivo_rechazo", label: "Motivo rechazo/anulación", type: "text" },
    { field: "numero_solicitud", label: "N° Solicitud", type: "text" },
    { field: "grupo_empresa", label: "Buscar Grupo", type: "text" },
    { field: "owner_name", label: "Propietario de Registro", type: "text" },
    { field: "respuesta_cen", label: "Respuesta CEN", type: "text" },
    { field: "consulta_cen", label: "Consulta CEN", type: "text" },
    { field: "contenido_cen", label: "Contenido CEN", type: "text" },
    { field: "estado_trabajador", label: "Estado Trabajador", type: "text" },
    { field: "motivo_tipo_exceso", label: "Motivo Tipo de exceso", type: "text" },

    { field: "razon_social", label: "Razón Social", type: "text" },
    { field: "rut", label: "RUT", type: "text" },
    { field: "company.razon_social", label: "Empresa", type: "text" },
    { field: "fee", label: "FEE", type: "number" },
    { field: "banco", label: "Banco", type: "text" },
    { field: "tipo_cuenta", label: "Tipo de Cuenta", type: "text" },
    { field: "numero_cuenta", label: "Número cuenta", type: "text" },
    { field: "confirmacion_cc", label: "Confirmación CC", type: "boolean" },
    { field: "confirmacion_poder", label: "Confirmación Poder", type: "boolean" },

    { field: "monto_devolucion", label: "Monto Devolución", type: "number" },
    { field: "monto_cliente", label: "Monto cliente", type: "number" },
    {
      field: "monto_finanfix_solutions",
      label: "Monto Finanfix",
      type: "number",
    },
    { field: "monto_pagado", label: "Monto Real Pagado", type: "number" },
    { field: "facturado_cliente", label: "Facturado cliente", type: "text" },
    { field: "facturado_finanfix", label: "Facturado Finanfix", type: "text" },
    { field: "numero_factura", label: "N° Factura", type: "text" },
    { field: "numero_oc", label: "N° OC", type: "text" },
    { field: "lineAfp.afp_name", label: "AFP", type: "text" },
  ];

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();

      data = data.filter((row) =>
        [
          row.management_type,
          row.razon_social,
          row.rut,
          row.entidad,
          row.estado_gestion,
          row.numero_solicitud,
          row.envio_afp,
          row.estado_contrato_cliente,
          row.estado_trabajador,
          row.motivo_tipo_exceso,
          row.motivo_rechazo,
          row.mes_produccion_2026,
          row.grupo_empresa,
          row.acceso_portal,
          row.banco,
          row.tipo_cuenta,
          row.numero_cuenta,
          row.consulta_cen,
          row.contenido_cen,
          row.respuesta_cen,
          row.facturado_finanfix,
          row.facturado_cliente,
          row.numero_factura,
          row.numero_oc,
          row.comment,
          row.lineAfp?.afp_name,
          row.mandante?.name,
          row.company?.razon_social,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeRules.length) {
      data = data.filter((row) =>
        activeRules.every((rule) =>
          matchRule(getValueByPath(row, rule.field), rule)
        )
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
          <button
            className="zoho-btn zoho-btn-primary"
            onClick={() => setModalOpen(true)}
          >
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
                  <th>Razón Social</th>
                  <th>RUT</th>
                  <th>AFP</th>
                  <th>Entidad</th>
                  <th>Estado Gestión</th>
                  <th>N° Solicitud</th>
                  <th>Monto Devolución</th>
                  <th>Monto Real Pagado</th>
                  <th>Banco</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10}>Sin gestiones creadas.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/managements/${row.id}/documents`)
                      }
                    >
                      <td>{row.management_type || "—"}</td>
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
                  ))
                )}
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
          <h3>0. Asociación de línea</h3>

          <div className="zoho-form-grid">
            <Field label="AFP / Línea asociada">
              {lineAfpId ? (
                <input
                  className="zoho-input"
                  value={
                    afp
                      ? `${afp.afp_name} · ${
                          afp.line?.company?.razon_social || "Sin empresa"
                        }`
                      : "Cargando AFP..."
                  }
                  disabled
                />
              ) : (
                <select
                  className="zoho-select"
                  value={form.line_afp_id}
                  onChange={(e) => updateForm("line_afp_id", e.target.value)}
                >
                  <option value="">Seleccionar AFP / Línea</option>
                  {allAfps.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.afp_name} ·{" "}
                      {item.line?.company?.razon_social || "Sin empresa"} ·{" "}
                      {item.line?.mandante?.name || "Sin mandante"}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>1. Ingreso de caso</h3>

          <div className="zoho-form-grid">
            <Field label="Tipo">
              <select
                className="zoho-select"
                value={form.management_type}
                onChange={(e) => updateForm("management_type", e.target.value)}
              >
                <option value="LM">LM</option>
                <option value="TP">TP</option>
              </select>
            </Field>

            <Field label="Mes de producción">
              <input
                className="zoho-input"
                value={form.mes_produccion_2026}
                onChange={(e) =>
                  updateForm("mes_produccion_2026", e.target.value)
                }
              />
            </Field>

            <Field label="Acceso portal">
              <select
                className="zoho-select"
                value={form.acceso_portal}
                onChange={(e) => updateForm("acceso_portal", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>

            <Field label="Envío AFP">
              <select
                className="zoho-select"
                value={form.envio_afp}
                onChange={(e) => updateForm("envio_afp", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Enviado">Enviado</option>
                <option value="Respondido">Respondido</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </Field>

            <Field label="Estado contrato con cliente">
              <select
                className="zoho-select"
                value={form.estado_contrato_cliente}
                onChange={(e) =>
                  updateForm("estado_contrato_cliente", e.target.value)
                }
              >
                <option value="">Seleccionar</option>
                <option value="Vigente">Vigente</option>
                <option value="No vigente">No vigente</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>

            <Field label="Estado Gestión">
              <select
                className="zoho-select"
                value={form.estado_gestion}
                onChange={(e) => updateForm("estado_gestion", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Pendiente Gestión">Pendiente Gestión</option>
                <option value="En preparación">En preparación</option>
                <option value="Enviada AFP">Enviada AFP</option>
                <option value="Respondida AFP">Respondida AFP</option>
                <option value="Pagada">Pagada</option>
                <option value="Facturada">Facturada</option>
                <option value="Cerrada">Cerrada</option>
                <option value="Rechazada">Rechazada</option>
              </select>
            </Field>

            <Field label="N° Solicitud">
              <input
                className="zoho-input"
                value={form.numero_solicitud}
                onChange={(e) => updateForm("numero_solicitud", e.target.value)}
              />
            </Field>

            <Field label="Motivo del rechazo/anulación">
              <input
                className="zoho-input"
                value={form.motivo_rechazo}
                onChange={(e) => updateForm("motivo_rechazo", e.target.value)}
              />
            </Field>

            <Field label="Propietario de Registro">
              <input
                className="zoho-input"
                value={form.owner_name}
                onChange={(e) => updateForm("owner_name", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>2. Datos identificatorios y bancarios</h3>

          <div className="zoho-form-grid">
            <Field label="Razón Social">
              <input
                className="zoho-input"
                value={form.razon_social}
                onChange={(e) => updateForm("razon_social", e.target.value)}
              />
            </Field>

            <Field label="RUT">
              <input
                className="zoho-input"
                value={form.rut}
                onChange={(e) => updateForm("rut", e.target.value)}
              />
            </Field>

            <Field label="Entidad">
              <input
                className="zoho-input"
                value={form.entidad}
                onChange={(e) => updateForm("entidad", e.target.value)}
              />
            </Field>

            <Field label="FEE">
              <input
                className="zoho-input"
                value={form.fee}
                onChange={(e) => updateForm("fee", e.target.value)}
              />
            </Field>

            <Field label="Banco">
              <input
                className="zoho-input"
                value={form.banco}
                onChange={(e) => updateForm("banco", e.target.value)}
              />
            </Field>

            <Field label="Tipo de Cuenta">
              <input
                className="zoho-input"
                value={form.tipo_cuenta}
                onChange={(e) => updateForm("tipo_cuenta", e.target.value)}
              />
            </Field>

            <Field label="Número cuenta">
              <input
                className="zoho-input"
                value={form.numero_cuenta}
                onChange={(e) => updateForm("numero_cuenta", e.target.value)}
              />
            </Field>

            <Field label="Confirmación CC">
              <select
                className="zoho-select"
                value={form.confirmacion_cc}
                onChange={(e) => updateForm("confirmacion_cc", e.target.value)}
              >
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </Field>

            <Field label="Confirmación Poder">
              <select
                className="zoho-select"
                value={form.confirmacion_poder}
                onChange={(e) =>
                  updateForm("confirmacion_poder", e.target.value)
                }
              >
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
              <select
                className="zoho-select"
                value={form.consulta_cen}
                onChange={(e) => updateForm("consulta_cen", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>

            <Field label="Contenido CEN">
              <select
                className="zoho-select"
                value={form.contenido_cen}
                onChange={(e) => updateForm("contenido_cen", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>

            <Field label="Respuesta CEN">
              <select
                className="zoho-select"
                value={form.respuesta_cen}
                onChange={(e) => updateForm("respuesta_cen", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>

            <Field label="Estado Trabajador">
              <select
                className="zoho-select"
                value={form.estado_trabajador}
                onChange={(e) => updateForm("estado_trabajador", e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Vigente">Vigente</option>
                <option value="No vigente">No vigente</option>
                <option value="Sin información">Sin información</option>
              </select>
            </Field>

            <Field label="Motivo (Tipo de exceso)">
              <select
                className="zoho-select"
                value={form.motivo_tipo_exceso}
                onChange={(e) =>
                  updateForm("motivo_tipo_exceso", e.target.value)
                }
              >
                <option value="">Seleccionar</option>
                <option value="LM">LM</option>
                <option value="TP">TP</option>
                <option value="LM + TP">LM + TP</option>
                <option value="Otro">Otro</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>4. Montos y facturación</h3>

          <div className="zoho-form-grid">
            <Field label="Monto Devolución">
              <input
                className="zoho-input"
                type="number"
                value={form.monto_devolucion}
                onChange={(e) => updateForm("monto_devolucion", e.target.value)}
              />
            </Field>

            <Field label="Monto Real Pagado">
              <input
                className="zoho-input"
                type="number"
                value={form.monto_pagado}
                onChange={(e) => updateForm("monto_pagado", e.target.value)}
              />
            </Field>

            <Field label="Monto Cliente">
              <input
                className="zoho-input"
                type="number"
                value={form.monto_cliente}
                onChange={(e) => updateForm("monto_cliente", e.target.value)}
              />
            </Field>

            <Field label="Monto Finanfix">
              <input
                className="zoho-input"
                type="number"
                value={form.monto_finanfix_solutions}
                onChange={(e) =>
                  updateForm("monto_finanfix_solutions", e.target.value)
                }
              />
            </Field>

            <Field label="Facturado cliente">
              <select
                className="zoho-select"
                value={form.facturado_cliente}
                onChange={(e) =>
                  updateForm("facturado_cliente", e.target.value)
                }
              >
                <option value="">Seleccionar</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>

            <Field label="Facturado Finanfix">
              <select
                className="zoho-select"
                value={form.facturado_finanfix}
                onChange={(e) =>
                  updateForm("facturado_finanfix", e.target.value)
                }
              >
                <option value="">Seleccionar</option>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>

            <Field label="N° Factura">
              <input
                className="zoho-input"
                value={form.numero_factura}
                onChange={(e) => updateForm("numero_factura", e.target.value)}
              />
            </Field>

            <Field label="N° OC">
              <input
                className="zoho-input"
                value={form.numero_oc}
                onChange={(e) => updateForm("numero_oc", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>5. Comentario</h3>

          <textarea
            className="zoho-input zoho-textarea"
            value={form.comment}
            onChange={(e) => updateForm("comment", e.target.value)}
          />
        </div>

        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>
            Cancelar
          </button>

          <button
            className="zoho-btn zoho-btn-primary"
            onClick={createManagement}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar Gestión"}
          </button>
        </div>
      </ZohoModal>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="zoho-form-field">
      <label>{label}</label>
      {children}
    </div>
  );
}