import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";

type Mandante = { id: string; name: string; owner_name?: string | null };

type CompanyRecord = {
  id: string;
  mandante_id?: string | null;
  management_type?: string | null;
  entidad?: string | null;
  rut?: string | null;
  estado_gestion?: string | null;
  monto_devolucion?: number | string | null;
  razon_social?: string | null;
  numero_solicitud?: string | null;
  mes_produccion_2026?: string | null;
  confirmacion_cc?: boolean | null;
  grupo_empresa?: string | null;
  acceso_portal?: string | null;
  banco?: string | null;
  facturado_finanfix?: string | null;
  facturado_cliente?: string | null;
  fecha_pago_afp?: string | null;
  numero_factura?: string | null;
  mandante?: { id: string; name?: string | null; nombre?: string | null } | null;
  company?: { razon_social?: string | null; rut?: string | null } | null;
  lineAfp?: { afp_name?: string | null } | null;
};

type ColumnDef = { key: string; label: string; render: (row: CompanyRecord) => string };

const defaultVisibleColumns = [
  "mandante",
  "entidad",
  "grupo_empresa",
  "confirmacion_cc",
  "rut",
  "estado_gestion",
  "monto_devolucion",
  "razon_social",
  "numero_solicitud",
  "mes_produccion_2026",
];

const columnDefs: ColumnDef[] = [
  { key: "mandante", label: "Mandante", render: (r) => r.mandante?.name || r.mandante?.nombre || "—" },
  { key: "entidad", label: "Entidad", render: (r) => r.entidad || r.lineAfp?.afp_name || "—" },
  { key: "grupo_empresa", label: "Buscar Grupo", render: (r) => r.grupo_empresa || "—" },
  { key: "confirmacion_cc", label: "Confirmación CC", render: (r) => yesNo(r.confirmacion_cc) },
  { key: "rut", label: "RUT", render: (r) => r.rut || r.company?.rut || "—" },
  { key: "estado_gestion", label: "Estado Gestión", render: (r) => r.estado_gestion || "—" },
  { key: "monto_devolucion", label: "Monto Devolución", render: (r) => money(r.monto_devolucion) },
  { key: "razon_social", label: "Razón Social", render: (r) => r.razon_social || r.company?.razon_social || "—" },
  { key: "numero_solicitud", label: "N° Solicitud", render: (r) => r.numero_solicitud || "—" },
  { key: "mes_produccion_2026", label: "Mes producción", render: (r) => r.mes_produccion_2026 || "—" },
  { key: "acceso_portal", label: "Acceso portal", render: (r) => r.acceso_portal || "—" },
  { key: "banco", label: "Banco", render: (r) => r.banco || "—" },
  { key: "facturado_finanfix", label: "Facturado Finanfix", render: (r) => r.facturado_finanfix || "—" },
  { key: "facturado_cliente", label: "Facturado cliente", render: (r) => r.facturado_cliente || "—" },
  { key: "fecha_pago_afp", label: "Fecha Pago AFP", render: (r) => formatDate(r.fecha_pago_afp) },
  { key: "numero_factura", label: "N° Factura", render: (r) => r.numero_factura || "—" },
];

function money(value?: number | string | null) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function yesNo(value?: boolean | null) {
  if (value === undefined || value === null) return "—";
  return value ? "Sí" : "No";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-CL");
}

function safeStoredColumns() {
  try {
    const raw = localStorage.getItem("operafix_record_columns");
    const parsed = raw ? JSON.parse(raw) : null;
    const validKeys = new Set(columnDefs.map((c) => c.key));
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((key) => validKeys.has(key));
      if (filtered.length >= 6) return filtered;
    }
  } catch {}
  return defaultVisibleColumns;
}

const emptyForm = {
  mandante_id: "",
  management_type: "LM",
  razon_social: "",
  rut: "",
  entidad: "",
  estado_gestion: "Pendiente Gestión",
  numero_solicitud: "",
  mes_produccion_2026: "",
  grupo_empresa: "",
  confirmacion_cc: "false",
  monto_devolucion: "",
};

export default function CompanyRecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<CompanyRecord[]>([]);
  const [mandantes, setMandantes] = useState<Mandante[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("Todos los Registros");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(safeStoredColumns);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragColumn, setDragColumn] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [recordData, mandanteData] = await Promise.all([
        fetchJson<CompanyRecord[]>("/records"),
        fetchJson<Mandante[]>("/mandantes"),
      ]);
      setRecords(recordData);
      setMandantes(mandanteData);
    } catch (error) {
      console.error(error);
      alert("No se pudieron cargar los registros de empresas.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem("operafix_record_columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const tabs = useMemo(() => {
    const names = mandantes.map((m) => m.name).filter(Boolean);
    return [...names, "Mis Registros", "Todos los Registros"];
  }, [mandantes]);

  const activeMandante = mandantes.find((m) => m.name === activeView);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = [...records];

    if (activeMandante) {
      data = data.filter((row) => row.mandante_id === activeMandante.id || row.mandante?.name === activeMandante.name);
    }

    if (activeView === "Mis Registros") {
      data = data.filter((row) => row.estado_gestion !== "Cerrada");
    }

    if (q) {
      data = data.filter((row) =>
        [
          row.mandante?.name,
          row.entidad,
          row.rut,
          row.estado_gestion,
          row.razon_social,
          row.company?.razon_social,
          row.numero_solicitud,
          row.mes_produccion_2026,
          row.grupo_empresa,
          row.lineAfp?.afp_name,
          row.banco,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    return data;
  }, [records, search, activeView, activeMandante]);

  const orderedColumns = visibleColumns
    .map((key) => columnDefs.find((column) => column.key === key))
    .filter(Boolean) as ColumnDef[];

  function toggleColumn(key: string) {
    setVisibleColumns((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  }

  function onDropColumn(target: string) {
    if (!dragColumn || dragColumn === target) return;
    setVisibleColumns((prev) => {
      const from = prev.indexOf(dragColumn);
      const to = prev.indexOf(target);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    setDragColumn(null);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function toggleAll() {
    setSelected((prev) => prev.length === filtered.length ? [] : filtered.map((row) => row.id));
  }

  async function deleteSelected() {
    if (!selected.length) return alert("Selecciona al menos un registro.");
    if (!confirm(`¿Eliminar ${selected.length} registro(s)? Esta acción no se puede deshacer.`)) return;

    await fetchJson("/records", {
      method: "DELETE",
      body: JSON.stringify({ ids: selected }),
    });
    setSelected([]);
    await fetchData();
  }

  async function createRecord() {
    if (!form.mandante_id) return alert("Debes seleccionar un mandante.");
    if (!form.razon_social.trim()) return alert("Debes ingresar la Razón Social.");
    if (!form.rut.trim()) return alert("Debes ingresar el RUT.");

    await postJson<CompanyRecord>("/records", {
      ...form,
      confirmacion_cc: form.confirmacion_cc === "true",
    });
    setCreateOpen(false);
    setForm(emptyForm);
    await fetchData();
  }

  return (
    <div className="zoho-module-page records-page-pro">
      <div className="zoho-module-header">
        <div>
          <h1>Registros de empresas</h1>
          <p>Lista de líneas/casos de gestión por empresa, AFP y mandante</p>
        </div>

        <div className="zoho-module-actions">
          <button className="zoho-btn" onClick={() => setFilterOpen((prev) => !prev)}>Filtrar</button>
          <button className="zoho-btn">Ordenar</button>
          <button className="zoho-btn" onClick={() => setColumnsOpen(true)}>Campos / columnas</button>
          {selected.length > 0 && <button className="zoho-btn danger" onClick={deleteSelected}>Eliminar seleccionados ({selected.length})</button>}
          <button className="zoho-btn zoho-btn-primary" onClick={() => setCreateOpen(true)}>Crear Registro de empresa</button>
        </div>
      </div>

      <div className="zoho-quick-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeView === tab ? "active" : ""}
            onClick={() => setActiveView(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={filterOpen ? "zoho-module-layout" : "zoho-module-layout records-layout-collapsed"}>
        {filterOpen && (
          <aside className="zoho-filter-panel">
            <h2>Filtrar Registros de empresas</h2>
            <input
              className="zoho-input"
              placeholder="Buscar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <h3>Filtros definidos por el sistema</h3>
            <label><input type="checkbox" /> Acción en registro</label>
            <label><input type="checkbox" /> Actividades</label>
            <label><input type="checkbox" /> Registros modificados</label>
            <label><input type="checkbox" /> Registros no modificados</label>

            <h3>Filtrar por campos</h3>
            {columnDefs.map((field) => (
              <label key={field.key}><input type="checkbox" /> {field.label}</label>
            ))}
          </aside>
        )}

        <section className="zoho-table-wrap records-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filtered.length}</span>
            <span>Vista: {activeView}</span>
            <span>{selected.length ? `${selected.length} seleccionados` : "1 a 100"}</span>
          </div>

          {loading ? (
            <div className="zoho-empty">Cargando registros...</div>
          ) : (
            <div className="zoho-table-scroll records-table-scroll">
              <table className="zoho-table records-main-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selected.length > 0 && selected.length === filtered.length} onChange={toggleAll} /></th>
                    {orderedColumns.map((column) => <th key={column.key}>{column.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={orderedColumns.length + 1}>Sin registros creados.</td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id}>
                        <td><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)} /></td>
                        {orderedColumns.map((column) => (
                          <td
                            key={column.key}
                            className={column.key === "razon_social" || column.key === "entidad" ? "zoho-link-cell" : ""}
                            onClick={() => (column.key === "razon_social" || column.key === "entidad") && navigate(`/records/${row.id}`)}
                          >
                            {column.render(row)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ZohoModal title="Crear Registro de empresa" isOpen={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="zoho-form-section">
          <h3>Datos principales</h3>
          <div className="zoho-form-grid">
            <Field label="Mandante">
              <select className="zoho-select" value={form.mandante_id} onChange={(e) => setForm((prev) => ({ ...prev, mandante_id: e.target.value }))}>
                <option value="">Seleccionar mandante</option>
                {mandantes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select className="zoho-select" value={form.management_type} onChange={(e) => setForm((prev) => ({ ...prev, management_type: e.target.value }))}>
                <option value="LM">LM</option>
                <option value="TP">TP</option>
              </select>
            </Field>
            <Field label="Razón Social"><input className="zoho-input" value={form.razon_social} onChange={(e) => setForm((prev) => ({ ...prev, razon_social: e.target.value }))} /></Field>
            <Field label="RUT"><input className="zoho-input" value={form.rut} onChange={(e) => setForm((prev) => ({ ...prev, rut: e.target.value }))} /></Field>
            <Field label="Entidad (AFP)"><input className="zoho-input" value={form.entidad} onChange={(e) => setForm((prev) => ({ ...prev, entidad: e.target.value }))} /></Field>
            <Field label="Estado Gestión"><input className="zoho-input" value={form.estado_gestion} onChange={(e) => setForm((prev) => ({ ...prev, estado_gestion: e.target.value }))} /></Field>
            <Field label="N° Solicitud"><input className="zoho-input" value={form.numero_solicitud} onChange={(e) => setForm((prev) => ({ ...prev, numero_solicitud: e.target.value }))} /></Field>
            <Field label="Mes producción"><input className="zoho-input" value={form.mes_produccion_2026} onChange={(e) => setForm((prev) => ({ ...prev, mes_produccion_2026: e.target.value }))} /></Field>
            <Field label="Grupo"><input className="zoho-input" value={form.grupo_empresa} onChange={(e) => setForm((prev) => ({ ...prev, grupo_empresa: e.target.value }))} /></Field>
            <Field label="Confirmación CC">
              <select className="zoho-select" value={form.confirmacion_cc} onChange={(e) => setForm((prev) => ({ ...prev, confirmacion_cc: e.target.value }))}>
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </Field>
            <Field label="Monto Devolución"><input className="zoho-input" type="number" value={form.monto_devolucion} onChange={(e) => setForm((prev) => ({ ...prev, monto_devolucion: e.target.value }))} /></Field>
          </div>
        </div>
        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setCreateOpen(false)}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={createRecord}>Guardar Registro</button>
        </div>
      </ZohoModal>

      <ZohoModal title="Campos y columnas" isOpen={columnsOpen} onClose={() => setColumnsOpen(false)}>
        <p>Marca los campos que quieres ver y arrastra las casillas seleccionadas para cambiar el orden.</p>
        <div className="record-column-list">
          {columnDefs.map((column) => {
            const checked = visibleColumns.includes(column.key);
            return (
              <label
                key={column.key}
                className={`record-column-card ${checked ? "selected" : ""}`}
                draggable={checked}
                onDragStart={() => setDragColumn(column.key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDropColumn(column.key)}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleColumn(column.key)} />
                <span>{column.label}</span>
                <small>{checked ? "visible / arrastrable" : "oculto"}</small>
              </label>
            );
          })}
        </div>
        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setVisibleColumns(defaultVisibleColumns)}>Vista estándar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={() => setColumnsOpen(false)}>Aplicar</button>
        </div>
      </ZohoModal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="zoho-form-field"><label>{label}</label>{children}</div>;
}
