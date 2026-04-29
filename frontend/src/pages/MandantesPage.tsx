import { useEffect, useMemo, useState } from "react";
import { fetchJson, postJson } from "../api";
import ZohoModal from "../components/ZohoModal";

type MandanteRow = {
  id: string;
  name: string;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  campaign?: string | null;
  active_contract?: string | null;
  end_contract_date?: string | null;
  _count?: {
    groups?: number;
    companies?: number;
    managements?: number;
  };
};

const emptyForm = {
  name: "",
  owner_name: "",
  email: "",
  phone: "",
  campaign: "",
  active_contract: "Vigente",
  end_contract_date: "",
};

function dateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function MandantesPage() {
  const [rows, setRows] = useState<MandanteRow[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MandanteRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await fetchJson<MandanteRow[]>("/mandantes");
      setRows(data);
    } catch (error) {
      console.error(error);
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.owner_name, row.email, row.phone, row.campaign, row.active_contract]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [rows, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row: MandanteRow) {
    setEditing(row);
    setForm({
      name: row.name || "",
      owner_name: row.owner_name || "",
      email: row.email || "",
      phone: row.phone || "",
      campaign: row.campaign || "",
      active_contract: row.active_contract || "Vigente",
      end_contract_date: dateInput(row.end_contract_date),
    });
    setModalOpen(true);
  }

  async function deleteMandante(row: MandanteRow) {
    const registros = row._count?.managements ?? 0;
    const empresas = row._count?.companies ?? 0;
    const grupos = row._count?.groups ?? 0;
    const message = `¿Eliminar el mandante "${row.name}"?\n\nTambién se eliminarán/aislarán sus gestiones, empresas, líneas, grupos y usuarios cliente asociados.\nRegistros: ${registros} · Empresas: ${empresas} · Grupos: ${grupos}`;
    if (!confirm(message)) return;
    try {
      await fetchJson(`/mandantes/${row.id}?force=true`, { method: "DELETE" });
      await load();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "No se pudo eliminar el mandante.");
    }
  }

  async function saveMandante() {
    if (!form.name.trim()) {
      alert("Debes ingresar el nombre del mandante.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await fetchJson(`/mandantes/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await postJson("/mandantes", form);
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el mandante.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="zoho-module-page">
      <div className="zoho-module-header">
        <div>
          <h1>Mandantes</h1>
          <p>Administración de mandantes para asignar registros de empresas</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary" onClick={openCreate}>
            Crear Mandante
          </button>
        </div>
      </div>

      <div className="mandantes-layout">
        <aside className="zoho-filter-panel">
          <h2>Filtrar Mandantes</h2>
          <input
            className="zoho-input"
            placeholder="Buscar mandante"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className="zoho-help-text">
            Usa el botón Crear Mandante para abrir el formulario en popup.
          </p>
        </aside>

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar">
            <span>Registros totales {filtered.length}</span>
          </div>

          <table className="zoho-table">
            <thead>
              <tr>
                <th>Mandante</th>
                <th>Propietario</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Contrato</th>
                <th>Registros</th>
                <th>Empresas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>Sin mandantes creados.</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="zoho-link-cell" onClick={() => openEdit(row)}>{row.name}</td>
                    <td>{row.owner_name || "—"}</td>
                    <td>{row.email || "—"}</td>
                    <td>{row.phone || "—"}</td>
                    <td>{row.active_contract || "—"}</td>
                    <td>{row._count?.managements ?? 0}</td>
                    <td>{row._count?.companies ?? 0}</td>
                    <td>
                      <div className="zoho-actions-row compact-actions">
                        <button className="zoho-small-btn" onClick={() => openEdit(row)}>
                          Editar
                        </button>
                        <button className="zoho-small-btn danger" onClick={() => deleteMandante(row)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      <ZohoModal
        title={editing ? "Editar Mandante" : "Crear Mandante"}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="zoho-form-section">
          <h3>Datos del mandante</h3>
          <div className="zoho-form-grid">
            <Field label="Nombre mandante">
              <input className="zoho-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Propietario">
              <input className="zoho-input" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="zoho-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <input className="zoho-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Campaña">
              <input className="zoho-input" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
            </Field>
            <Field label="Contrato activo">
              <select className="zoho-select" value={form.active_contract} onChange={(e) => setForm({ ...form, active_contract: e.target.value })}>
                <option value="Vigente">Vigente</option>
                <option value="No vigente">No vigente</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </Field>
            <Field label="Fecha término contrato">
              <input className="zoho-input" type="date" value={form.end_contract_date} onChange={(e) => setForm({ ...form, end_contract_date: e.target.value })} />
            </Field>
          </div>
        </div>
        <div className="zoho-form-actions">
          <button className="zoho-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="zoho-btn zoho-btn-primary" onClick={saveMandante} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Mandante"}
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
