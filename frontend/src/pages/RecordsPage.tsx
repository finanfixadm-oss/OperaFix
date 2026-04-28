import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModuleFilterPanel from "../components/ModuleFilterPanel";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";
import type { FilterRule, ManagementLineAfp } from "../types";
import type { RecordItem } from "../types-records";
import { defaultRecordColumnFields, formatCellValue, getValueByPath, recordColumns, recordFilterFields } from "../utils-record-fields";

type MandanteOption = {
  id: string;
  name: string;
};

type FormState = {
  mandante_id: string;
  line_afp_id: string;
  management_type: string;
  owner_name: string;
  razon_social: string;
  rut: string;
  direccion: string;
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
  mes_ingreso_solicitud: string;
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
  monto_finanfix_solutions: string;
  monto_real_cliente: string;
  monto_real_finanfix_solutions: string;
  fee: string;
  facturado_finanfix: string;
  facturado_cliente: string;
  fecha_factura_finanfix: string;
  fecha_pago_factura_finanfix: string;
  fecha_notificacion_cliente: string;
  numero_factura: string;
  numero_oc: string;
  comment: string;
};

const emptyForm: FormState = {
  mandante_id: "",
  line_afp_id: "",
  management_type: "LM",
  owner_name: "",
  razon_social: "",
  rut: "",
  direccion: "",
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
  mes_ingreso_solicitud: "",
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
  monto_finanfix_solutions: "",
  monto_real_cliente: "",
  monto_real_finanfix_solutions: "",
  fee: "",
  facturado_finanfix: "",
  facturado_cliente: "",
  fecha_factura_finanfix: "",
  fecha_pago_factura_finanfix: "",
  fecha_notificacion_cliente: "",
  numero_factura: "",
  numero_oc: "",
  comment: "",
};

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

function normalizeMandanteText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function rowMatchesMandante(row: RecordItem, mandante: MandanteOption) {
  const rowAny: any = row;
  const rowMandante: any = row.mandante || {};
  const possibleIds = [rowMandante.id, rowAny.mandante_id, rowAny.mandanteId].filter(Boolean).map(String);
  if (possibleIds.includes(String(mandante.id))) return true;

  const targetName = normalizeMandanteText(mandante.name);
  const possibleNames = [rowMandante.name, rowAny.mandante_name, rowAny.mandante].map((value) => normalizeMandanteText(value));
  return possibleNames.includes(targetName);
}

export default function RecordsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<RecordItem[]>([]);
  const [mandantes, setMandantes] = useState<MandanteOption[]>([]);
  const [allAfps, setAllAfps] = useState<ManagementLineAfp[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeRules, setActiveRules] = useState<FilterRule[]>([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [activeView, setActiveView] = useState("todos");
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("operafix_records_visible_columns_v26");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.filter((field) => recordColumns.some((column) => column.field === field));
        }
      }
    } catch {}
    return defaultRecordColumnFields;
  });

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

  async function loadAfps() {
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
    loadMandantes();
    loadAfps();
  }, []);

  useEffect(() => {
    localStorage.setItem("operafix_records_visible_columns_v26", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const selectedAfp = useMemo(() => allAfps.find((item) => item.id === form.line_afp_id) || null, [allAfps, form.line_afp_id]);

  async function createRecord() {
    if (!form.mandante_id.trim()) {
      alert("Debes seleccionar el mandante.");
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

    const selectedMandante = mandantes.find((item) => item.id === form.mandante_id);
    const line = selectedAfp?.line;
    const { line_afp_id: _ignoredLineAfpId, ...formPayload } = form;

    setSaving(true);
    try {
      await postJson<RecordItem>("/records", {
        ...(line?.group?.id ? { group_id: line.group.id } : {}),
        ...(line?.company?.id ? { company_id: line.company.id } : {}),
        ...(line?.id ? { line_id: line.id } : {}),
        ...(selectedAfp?.id ? { line_afp_id: selectedAfp.id } : {}),
        ...formPayload,
        mandante_id: form.mandante_id,
        mandante_name: selectedMandante?.name,
        confirmacion_cc: form.confirmacion_cc === "true",
        confirmacion_poder: form.confirmacion_poder === "true",
      });

      setModalOpen(false);
      setForm(emptyForm);
      await loadRows();
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el registro de empresa.");
    } finally {
      setSaving(false);
    }
  }

  const fields = recordFilterFields;
  const selectedColumns = useMemo(() => {
    return visibleColumns
      .map((field) => recordColumns.find((column) => column.field === field))
      .filter(Boolean) as typeof recordColumns;
  }, [visibleColumns]);

  function toggleColumn(field: string) {
    setVisibleColumns((prev) => prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]);
  }

  function moveColumn(field: string, direction: "left" | "right") {
    setVisibleColumns((prev) => {
      const index = prev.indexOf(field);
      if (index === -1) return prev;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function resetColumns() {
    setVisibleColumns(defaultRecordColumnFields);
  }

  function selectAllColumns() {
    setVisibleColumns(recordColumns.map((column) => column.field));
  }

  const filteredRows = useMemo(() => {
    let data = [...rows];

    if (activeView !== "todos" && activeView !== "mis") {
      const selectedMandante = mandantes.find((mandante) => mandante.id === activeView);
      if (selectedMandante) {
        data = data.filter((row) => rowMatchesMandante(row, selectedMandante));
      }
    }

    if (activeView === "mis") {
      data = data.filter((row) => Boolean(row.owner_name));
    }

    if (quickSearch.trim()) {
      const q = quickSearch.toLowerCase();
      data = data.filter((row) =>
        recordColumns
          .map((column) => column.value(row))
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    if (activeRules.length) {
      data = data.filter((row) => activeRules.every((rule) => matchRule(getValueByPath(row, rule.field), rule)));
    }

    return data;
  }, [rows, activeRules, quickSearch, activeView, mandantes]);

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
          <button className="zoho-btn" onClick={() => setColumnModalOpen(true)}>Campos / columnas</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>
            Crear Registro de empresa
          </button>
        </div>
      </div>

      <div className="zoho-view-tabs">
        {mandantes.map((mandante) => (
          <button
            key={mandante.id}
            className={activeView === mandante.id ? "active" : ""}
            onClick={() => setActiveView(mandante.id)}
          >
            {mandante.name}
          </button>
        ))}
        <button className={activeView === "mis" ? "active" : ""} onClick={() => setActiveView("mis")}>Mis Registros</button>
        <button className={activeView === "todos" ? "active" : ""} onClick={() => setActiveView("todos")}>Todos los registros</button>
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

        <section className="zoho-table-wrap zoho-table-wrap-scroll">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filteredRows.length}</span>
            <span className="zoho-table-range">1 a {Math.min(filteredRows.length, 100)}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando registros...</div>
          ) : (
            <div className="zoho-table-horizontal-scroll">
            <table className="zoho-table zoho-table-wide">
              <thead>
                <tr>
                  <th><input type="checkbox" /></th>
                  {selectedColumns.map((column) => <th key={column.field}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={selectedColumns.length + 1}>Sin registros de empresas.</td></tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td><input type="checkbox" /></td>
                      {selectedColumns.map((column) => {
                        const value = column.value(row);
                        const clickable = ["razon_social", "entidad", "company.razon_social", "lineAfp.afp_name"].includes(column.field);
                        return (
                          <td
                            key={`${row.id}-${column.field}`}
                            className={clickable ? "zoho-link-cell" : ""}
                            onClick={clickable ? () => navigate(`/records/${row.id}`) : undefined}
                          >
                            {formatCellValue(value, column)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          )}
        </section>
      </div>

      <ZohoModal title="Campos visibles en Registros de empresas" isOpen={columnModalOpen} onClose={() => setColumnModalOpen(false)}>
        <div className="column-picker-actions">
          <button className="zoho-btn" onClick={selectAllColumns}>Mostrar todos</button>
          <button className="zoho-btn" onClick={resetColumns}>Vista estándar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setColumnModalOpen(false)}>Aplicar</button>
        </div>
        <div className="column-order-help">
          Marca los campos que quieres ver y usa ← / → para definir el orden en la tabla.
        </div>
        <div className="column-picker-grid column-picker-grid-orderable">
          {recordColumns.map((column) => {
            const isVisible = visibleColumns.includes(column.field);
            const position = visibleColumns.indexOf(column.field);
            return (
              <div key={column.field} className={"column-picker-item column-picker-order-item " + (isVisible ? "active" : "")}>
                <label>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumn(column.field)}
                  />
                  <span>{column.label}</span>
                </label>
                <div className="column-order-controls">
                  <span className="column-position">{isVisible ? position + 1 : "—"}</span>
                  <button className="mini-order-btn" type="button" disabled={!isVisible || position <= 0} onClick={() => moveColumn(column.field, "left")}>←</button>
                  <button className="mini-order-btn" type="button" disabled={!isVisible || position === visibleColumns.length - 1} onClick={() => moveColumn(column.field, "right")}>→</button>
                </div>
              </div>
            );
          })}
        </div>
      </ZohoModal>
      <ZohoModal title="Crear Registro de empresa" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <FormSection title="0. Asociación">
          <Field label="Mandante">
            <select className="zoho-select" value={form.mandante_id} onChange={(e) => updateForm("mandante_id", e.target.value)}>
              <option value="">Seleccionar mandante</option>
              {mandantes.map((mandante) => (
                <option key={mandante.id} value={mandante.id}>{mandante.name}</option>
              ))}
            </select>
          </Field>

          <Field label="AFP / Línea asociada (opcional)">
            <select className="zoho-select" value={form.line_afp_id} onChange={(e) => updateForm("line_afp_id", e.target.value)}>
              <option value="">Crear automáticamente según Razón Social / RUT / Entidad</option>
              {allAfps.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.afp_name} · {item.line?.company?.razon_social || "Sin empresa"} · {item.line?.mandante?.name || "Sin mandante"}
                </option>
              ))}
            </select>
          </Field>
        </FormSection>

        <FormSection title="1. Ingreso de caso">
          <Field label="Tipo"><select className="zoho-select" value={form.management_type} onChange={(e) => updateForm("management_type", e.target.value)}><option value="LM">LM</option><option value="TP">TP</option></select></Field>
          <Field label="Mes de producción"><input className="zoho-input" value={form.mes_produccion_2026} onChange={(e) => updateForm("mes_produccion_2026", e.target.value)} /></Field>
          <Field label="Mes de ingreso solicitud"><input className="zoho-input" value={form.mes_ingreso_solicitud} onChange={(e) => updateForm("mes_ingreso_solicitud", e.target.value)} /></Field>
          <Field label="Acceso portal"><SelectYesNo value={form.acceso_portal} onChange={(v) => updateForm("acceso_portal", v)} /></Field>
          <Field label="Envío AFP"><SelectStatus value={form.envio_afp} onChange={(v) => updateForm("envio_afp", v)} options={["Pendiente", "Enviado", "Respondido", "Rechazado"]} /></Field>
          <Field label="Estado contrato con cliente"><SelectStatus value={form.estado_contrato_cliente} onChange={(v) => updateForm("estado_contrato_cliente", v)} options={["Vigente", "No vigente", "Pendiente"]} /></Field>
          <Field label="Estado Gestión"><SelectStatus value={form.estado_gestion} onChange={(v) => updateForm("estado_gestion", v)} options={["Pendiente Gestión", "En preparación", "Enviada AFP", "Respondida AFP", "Pagada", "Facturada", "Cerrada", "Rechazada"]} /></Field>
          <Field label="N° Solicitud"><input className="zoho-input" value={form.numero_solicitud} onChange={(e) => updateForm("numero_solicitud", e.target.value)} /></Field>
          <Field label="Motivo del rechazo/anulación"><input className="zoho-input" value={form.motivo_rechazo} onChange={(e) => updateForm("motivo_rechazo", e.target.value)} /></Field>
          <Field label="Fecha rechazo"><input className="zoho-input" type="date" value={form.fecha_rechazo} onChange={(e) => updateForm("fecha_rechazo", e.target.value)} /></Field>
          <Field label="Buscar Grupo"><input className="zoho-input" value={form.grupo_empresa} onChange={(e) => updateForm("grupo_empresa", e.target.value)} /></Field>
          <Field label="Propietario"><input className="zoho-input" value={form.owner_name} onChange={(e) => updateForm("owner_name", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="2. Datos empresa y bancarios">
          <Field label="Razón Social"><input className="zoho-input" value={form.razon_social} onChange={(e) => updateForm("razon_social", e.target.value)} /></Field>
          <Field label="RUT"><input className="zoho-input" value={form.rut} onChange={(e) => updateForm("rut", e.target.value)} /></Field>
          <Field label="Dirección"><input className="zoho-input" value={form.direccion} onChange={(e) => updateForm("direccion", e.target.value)} /></Field>
          <Field label="Entidad (AFP)"><input className="zoho-input" value={form.entidad} onChange={(e) => updateForm("entidad", e.target.value)} /></Field>
          <Field label="Banco"><input className="zoho-input" value={form.banco} onChange={(e) => updateForm("banco", e.target.value)} /></Field>
          <Field label="Tipo de Cuenta"><input className="zoho-input" value={form.tipo_cuenta} onChange={(e) => updateForm("tipo_cuenta", e.target.value)} /></Field>
          <Field label="Número cuenta"><input className="zoho-input" value={form.numero_cuenta} onChange={(e) => updateForm("numero_cuenta", e.target.value)} /></Field>
          <Field label="Confirmación CC"><SelectBool value={form.confirmacion_cc} onChange={(v) => updateForm("confirmacion_cc", v)} /></Field>
          <Field label="Confirmación Poder"><SelectBool value={form.confirmacion_poder} onChange={(v) => updateForm("confirmacion_poder", v)} /></Field>
        </FormSection>

        <FormSection title="3. CEN, montos y facturación">
          <Field label="Consulta CEN"><SelectYesNo value={form.consulta_cen} onChange={(v) => updateForm("consulta_cen", v)} /></Field>
          <Field label="Contenido CEN"><SelectYesNo value={form.contenido_cen} onChange={(v) => updateForm("contenido_cen", v)} /></Field>
          <Field label="Respuesta CEN"><SelectYesNo value={form.respuesta_cen} onChange={(v) => updateForm("respuesta_cen", v)} /></Field>
          <Field label="Estado Trabajador"><SelectStatus value={form.estado_trabajador} onChange={(v) => updateForm("estado_trabajador", v)} options={["Vigente", "No vigente", "Sin información"]} /></Field>
          <Field label="Motivo Tipo de exceso"><SelectStatus value={form.motivo_tipo_exceso} onChange={(v) => updateForm("motivo_tipo_exceso", v)} options={["LM", "TP", "LM + TP", "Otro"]} /></Field>
          <Field label="Monto Devolución"><input className="zoho-input" type="number" value={form.monto_devolucion} onChange={(e) => updateForm("monto_devolucion", e.target.value)} /></Field>
          <Field label="Monto Real Pagado"><input className="zoho-input" type="number" value={form.monto_pagado} onChange={(e) => updateForm("monto_pagado", e.target.value)} /></Field>
          <Field label="Monto cliente"><input className="zoho-input" type="number" value={form.monto_cliente} onChange={(e) => updateForm("monto_cliente", e.target.value)} /></Field>
          <Field label="Monto Finanfix"><input className="zoho-input" type="number" value={form.monto_finanfix_solutions} onChange={(e) => updateForm("monto_finanfix_solutions", e.target.value)} /></Field>
          <Field label="Monto real cliente"><input className="zoho-input" type="number" value={form.monto_real_cliente} onChange={(e) => updateForm("monto_real_cliente", e.target.value)} /></Field>
          <Field label="Monto real Finanfix Solutions"><input className="zoho-input" type="number" value={form.monto_real_finanfix_solutions} onChange={(e) => updateForm("monto_real_finanfix_solutions", e.target.value)} /></Field>
          <Field label="FEE"><input className="zoho-input" type="number" value={form.fee} onChange={(e) => updateForm("fee", e.target.value)} /></Field>
          <Field label="Facturado cliente"><SelectYesNo value={form.facturado_cliente} onChange={(v) => updateForm("facturado_cliente", v)} /></Field>
          <Field label="Facturado Finanfix"><SelectYesNo value={form.facturado_finanfix} onChange={(v) => updateForm("facturado_finanfix", v)} /></Field>
          <Field label="Fecha Pago AFP"><input className="zoho-input" type="date" value={form.fecha_pago_afp} onChange={(e) => updateForm("fecha_pago_afp", e.target.value)} /></Field>
          <Field label="Fecha Factura Finanfix"><input className="zoho-input" type="date" value={form.fecha_factura_finanfix} onChange={(e) => updateForm("fecha_factura_finanfix", e.target.value)} /></Field>
          <Field label="Fecha pago factura Finanfix"><input className="zoho-input" type="date" value={form.fecha_pago_factura_finanfix} onChange={(e) => updateForm("fecha_pago_factura_finanfix", e.target.value)} /></Field>
          <Field label="Fecha notificación cliente"><input className="zoho-input" type="date" value={form.fecha_notificacion_cliente} onChange={(e) => updateForm("fecha_notificacion_cliente", e.target.value)} /></Field>
          <Field label="N° Factura"><input className="zoho-input" value={form.numero_factura} onChange={(e) => updateForm("numero_factura", e.target.value)} /></Field>
          <Field label="N° OC"><input className="zoho-input" value={form.numero_oc} onChange={(e) => updateForm("numero_oc", e.target.value)} /></Field>
        </FormSection>

        <FormSection title="4. Comentario">
          <Field label="Comentario"><textarea className="zoho-input zoho-textarea" value={form.comment} onChange={(e) => updateForm("comment", e.target.value)} /></Field>
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

function SelectStatus({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select className="zoho-select" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Seleccionar</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function SelectYesNo({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <SelectStatus value={value} onChange={onChange} options={["Sí", "No", "Pendiente"]} />;
}

function SelectBool({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select className="zoho-select" value={value} onChange={(e) => onChange(e.target.value)}><option value="false">No</option><option value="true">Sí</option></select>;
}
