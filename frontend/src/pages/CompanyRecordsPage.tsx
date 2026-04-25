import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";

type Mandante = {
  id: string;
  name: string;
};

type RecordRow = {
  id: string;
  mandante_id?: string | null;
  management_type?: string | null;
  razon_social?: string | null;
  rut?: string | null;
  entidad?: string | null;
  estado_gestion?: string | null;
  monto_devolucion?: number | string | null;
  numero_solicitud?: string | null;
  mes_produccion_2026?: string | null;
  grupo_empresa?: string | null;
  confirmacion_cc?: boolean | null;
  mandante?: Mandante | null;
  company?: { razon_social?: string | null; rut?: string | null } | null;
  lineAfp?: { afp_name?: string | null } | null;
};

const emptyForm = {
  mandante_id: "",
  mandante_name: "",
  management_type: "LM",
  razon_social: "",
  rut: "",
  entidad: "AFP Capital",
  estado_gestion: "Pendiente Gestión",
  numero_solicitud: "",
  mes_produccion_2026: "",
  grupo_empresa: "Grupo general",
  motivo_tipo_exceso: "LM",
  acceso_portal: "Pendiente",
  envio_afp: "Pendiente",
  estado_contrato_cliente: "Vigente",
  estado_trabajador: "Sin información",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
  confirmacion_cc: "false",
  confirmacion_poder: "false",
  monto_devolucion: "",
  monto_pagado: "",
  monto_cliente: "",
  fee: "",
  monto_finanfix_solutions: "",
  facturado_cliente: "Pendiente",
  facturado_finanfix: "Pendiente",
  numero_factura: "",
  numero_oc: "",
  comment: "",
};

const fallbackMandantes: Mandante[] = [
  { id: "preset-optimiza", name: "Optimiza Consulting" },
  { id: "preset-mundo", name: "Mundo Previsional" },
];

function money(value: unknown) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

function text(value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

export default function CompanyRecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [mandantes, setMandantes] = useState<Mandante[]>([]);
  const [activeMandante, setActiveMandante] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const visibleMandantes = mandantes.length ? mandantes : fallbackMandantes;

  async function loadMandantes() {
    try {
      const data = await fetchJson<Mandante[]>("/mandantes");
      setMandantes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMandantes([]);
    }
  }

  async function loadRecords() {
    setLoading(true);
    try {
      const selected = visibleMandantes.find((m) => m.id === activeMandante);
      const query: Record<string, string | undefined> = {
        search: search.trim() || undefined,
      };

      if (activeMandante !== "ALL" && selected) {
        if (selected.id.startsWith("preset-")) {
          query.mandante = selected.name;
        } else {
          query.mandante_id = selected.id;
        }
      }

      const data = await fetchJson<RecordRow[]>("/records", { query });
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar los registros de empresas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMandantes();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [activeMandante]);

  const filteredRecords = useMemo(() => records, [records]);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    if (field === "mandante_id") {
      const selected = visibleMandantes.find((m) => m.id === value);
      setForm((prev) => ({
        ...prev,
        mandante_id: value,
        mandante_name: selected?.name || "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createRecord() {
    if (!form.mandante_id && !form.mandante_name.trim()) {
      alert("Debes seleccionar un mandante.");
      return;
    }

    if (!form.razon_social.trim()) {
      alert("Debes ingresar la Razón Social.");
      return;
    }

    if (!form.rut.trim()) {
      alert("Debes ingresar el RUT.");
      return;
    }

    setSaving(true);
    try {
      const selected = visibleMandantes.find((m) => m.id === form.mandante_id);
      const payload = {
        ...form,
        mandante_id: selected && !selected.id.startsWith("preset-") ? selected.id : undefined,
        mandante_name: form.mandante_name || selected?.name,
        confirmacion_cc: form.confirmacion_cc === "true",
        confirmacion_poder: form.confirmacion_poder === "true",
      };

      const created = await postJson<RecordRow>("/records", payload);
      setModalOpen(false);
      setForm(emptyForm);
      await loadMandantes();
      await loadRecords();
      navigate(`/records/${created.id}`);
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el registro de empresa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Registros de empresas</h1>
          <p>Lista de líneas/casos de gestión por empresa, mandante y AFP</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn">Filtrar</button>
          <button className="zoho-btn">Ordenar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>
            Crear Registro de empresa
          </button>
        </div>
      </div>

      <div className="zoho-quick-tabs">
        {visibleMandantes.map((m) => (
          <button
            key={m.id}
            className={`zoho-btn ${activeMandante === m.id ? "zoho-btn-primary" : ""}`}
            onClick={() => setActiveMandante(m.id)}
          >
            {m.name}
          </button>
        ))}
        <button
          className={`zoho-btn ${activeMandante === "ALL" ? "zoho-btn-primary" : ""}`}
          onClick={() => setActiveMandante("ALL")}
        >
          Todos los registros
        </button>
      </div>

      <div className="zoho-module-layout">
        <aside className="zoho-filter-panel">
          <div className="zoho-filter-title">Filtrar Registros de empresas</div>
          <div className="zoho-filter-search">
            <input
              className="zoho-input"
              placeholder="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadRecords();
              }}
            />
          </div>
          <div className="zoho-filter-section-title">Filtros definidos por el sistema</div>
          <label className="zoho-filter-item-label"><input type="checkbox" /> Acción en registro</label>
          <label className="zoho-filter-item-label"><input type="checkbox" /> Registros modificados</label>
          <label className="zoho-filter-item-label"><input type="checkbox" /> Registros no modificados</label>
          <div className="zoho-filter-section-title" style={{ marginTop: 14 }}>Filtrar por campos</div>
          {["Acceso portal", "Banco", "Buscar Grupo", "Confirmación CC", "Entidad", "Estado Gestión", "Mandante"].map((item) => (
            <label className="zoho-filter-item-label" key={item}><input type="checkbox" /> {item}</label>
          ))}
          <div className="zoho-filter-actions">
            <button className="zoho-btn zoho-btn-primary" onClick={loadRecords}>Aplicar filtro</button>
            <button className="zoho-btn" onClick={() => { setSearch(""); setActiveMandante("ALL"); }}>Borrar</button>
          </div>
        </aside>

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filteredRecords.length}</span>
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
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan={11}>Sin registros creados.</td></tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} onClick={() => navigate(`/records/${r.id}`)} style={{ cursor: "pointer" }}>
                      <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                      <td>{text(r.mandante?.name)}</td>
                      <td>{text(r.entidad || r.lineAfp?.afp_name)}</td>
                      <td>{text(r.grupo_empresa)}</td>
                      <td>{text(r.confirmacion_cc)}</td>
                      <td>{text(r.rut || r.company?.rut)}</td>
                      <td>{text(r.estado_gestion)}</td>
                      <td>{money(r.monto_devolucion)}</td>
                      <td className="zoho-link-cell">{text(r.razon_social || r.company?.razon_social)}</td>
                      <td>{text(r.numero_solicitud)}</td>
                      <td>{text(r.mes_produccion_2026)}</td>
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
          <h3>1. Asociación y datos base</h3>
          <div className="zoho-form-grid">
            <Field label="Mandante">
              <select className="zoho-select" value={form.mandante_id} onChange={(e) => updateForm("mandante_id", e.target.value)}>
                <option value="">Seleccionar mandante</option>
                {visibleMandantes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo de gestión">
              <select className="zoho-select" value={form.management_type} onChange={(e) => updateForm("management_type", e.target.value)}>
                <option value="LM">LM</option>
                <option value="TP">TP</option>
              </select>
            </Field>
            <Field label="Razón Social"><input className="zoho-input" value={form.razon_social} onChange={(e) => updateForm("razon_social", e.target.value)} /></Field>
            <Field label="RUT"><input className="zoho-input" value={form.rut} onChange={(e) => updateForm("rut", e.target.value)} /></Field>
            <Field label="Entidad AFP"><input className="zoho-input" value={form.entidad} onChange={(e) => updateForm("entidad", e.target.value)} /></Field>
            <Field label="Buscar Grupo"><input className="zoho-input" value={form.grupo_empresa} onChange={(e) => updateForm("grupo_empresa", e.target.value)} /></Field>
            <Field label="Mes producción"><input className="zoho-input" value={form.mes_produccion_2026} onChange={(e) => updateForm("mes_produccion_2026", e.target.value)} /></Field>
            <Field label="N° Solicitud"><input className="zoho-input" value={form.numero_solicitud} onChange={(e) => updateForm("numero_solicitud", e.target.value)} /></Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>2. Gestión</h3>
          <div className="zoho-form-grid">
            <Field label="Estado Gestión"><select className="zoho-select" value={form.estado_gestion} onChange={(e) => updateForm("estado_gestion", e.target.value)}><option>Pendiente Gestión</option><option>En preparación</option><option>Enviada AFP</option><option>Respondida AFP</option><option>Pagada</option><option>Facturada</option><option>Cerrada</option><option>Rechazada</option></select></Field>
            <Field label="Motivo Tipo de exceso"><select className="zoho-select" value={form.motivo_tipo_exceso} onChange={(e) => updateForm("motivo_tipo_exceso", e.target.value)}><option>LM</option><option>TP</option><option>LM + TP</option><option>Otro</option></select></Field>
            <Field label="Acceso portal"><select className="zoho-select" value={form.acceso_portal} onChange={(e) => updateForm("acceso_portal", e.target.value)}><option>Pendiente</option><option>Sí</option><option>No</option></select></Field>
            <Field label="Envío AFP"><select className="zoho-select" value={form.envio_afp} onChange={(e) => updateForm("envio_afp", e.target.value)}><option>Pendiente</option><option>Enviado</option><option>Respondido</option><option>Rechazado</option></select></Field>
            <Field label="Confirmación CC"><select className="zoho-select" value={form.confirmacion_cc} onChange={(e) => updateForm("confirmacion_cc", e.target.value)}><option value="false">No</option><option value="true">Sí</option></select></Field>
            <Field label="Confirmación Poder"><select className="zoho-select" value={form.confirmacion_poder} onChange={(e) => updateForm("confirmacion_poder", e.target.value)}><option value="false">No</option><option value="true">Sí</option></select></Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>3. Bancarios, montos y facturación</h3>
          <div className="zoho-form-grid">
            <Field label="Banco"><input className="zoho-input" value={form.banco} onChange={(e) => updateForm("banco", e.target.value)} /></Field>
            <Field label="Tipo cuenta"><input className="zoho-input" value={form.tipo_cuenta} onChange={(e) => updateForm("tipo_cuenta", e.target.value)} /></Field>
            <Field label="Número cuenta"><input className="zoho-input" value={form.numero_cuenta} onChange={(e) => updateForm("numero_cuenta", e.target.value)} /></Field>
            <Field label="Monto devolución"><input className="zoho-input" type="number" value={form.monto_devolucion} onChange={(e) => updateForm("monto_devolucion", e.target.value)} /></Field>
            <Field label="Monto pagado"><input className="zoho-input" type="number" value={form.monto_pagado} onChange={(e) => updateForm("monto_pagado", e.target.value)} /></Field>
            <Field label="FEE"><input className="zoho-input" type="number" value={form.fee} onChange={(e) => updateForm("fee", e.target.value)} /></Field>
            <Field label="Facturado cliente"><select className="zoho-select" value={form.facturado_cliente} onChange={(e) => updateForm("facturado_cliente", e.target.value)}><option>Pendiente</option><option>Sí</option><option>No</option></select></Field>
            <Field label="Facturado Finanfix"><select className="zoho-select" value={form.facturado_finanfix} onChange={(e) => updateForm("facturado_finanfix", e.target.value)}><option>Pendiente</option><option>Sí</option><option>No</option></select></Field>
            <Field label="N° Factura"><input className="zoho-input" value={form.numero_factura} onChange={(e) => updateForm("numero_factura", e.target.value)} /></Field>
            <Field label="N° OC"><input className="zoho-input" value={form.numero_oc} onChange={(e) => updateForm("numero_oc", e.target.value)} /></Field>
          </div>
        </div>

        <div className="zoho-form-section">
          <h3>4. Comentario</h3>
          <textarea className="zoho-input zoho-textarea" value={form.comment} onChange={(e) => updateForm("comment", e.target.value)} />
        </div>

        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={createRecord} disabled={saving}>{saving ? "Guardando..." : "Guardar Registro"}</button>
        </div>
      </ZohoModal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="zoho-form-field"><label>{label}</label>{children}</div>;
}
