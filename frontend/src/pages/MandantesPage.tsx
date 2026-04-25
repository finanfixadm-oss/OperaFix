import { useEffect, useMemo, useState } from "react";
import { fetchJson, postJson } from "../api";

type MandanteRow = {
  id: string;
  name: string;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  campaign?: string | null;
  active_contract?: string | null;
  _count?: { groups?: number; companies?: number; managements?: number };
};

const emptyForm = {
  name: "",
  owner_name: "",
  email: "",
  phone: "",
  campaign: "",
  active_contract: "",
};

export default function MandantesPage() {
  const [rows, setRows] = useState<MandanteRow[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadRows() {
    try {
      const data = await fetchJson<MandanteRow[]>("/mandantes");
      setRows(data);
    } catch (error) {
      console.error(error);
      setRows([]);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.owner_name, row.email, row.phone, row.campaign, row.active_contract]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [rows, search]);

  async function createMandante() {
    if (!form.name.trim()) {
      alert("Debes ingresar el nombre del mandante.");
      return;
    }

    setSaving(true);
    try {
      await postJson("/mandantes", form);
      setForm(emptyForm);
      await loadRows();
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el mandante.");
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
          <button className="zoho-btn zoho-btn-primary" onClick={createMandante} disabled={saving}>{saving ? "Guardando..." : "Crear Mandante"}</button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <aside className="zoho-filter-panel">
          <h2>Crear mandante</h2>
          <input className="zoho-input" placeholder="Buscar mandante" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="zoho-form-field"><label>Nombre mandante</label><input className="zoho-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="zoho-form-field"><label>Propietario</label><input className="zoho-input" value={form.owner_name} onChange={(event) => setForm({ ...form, owner_name: event.target.value })} /></div>
          <div className="zoho-form-field"><label>Email</label><input className="zoho-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div className="zoho-form-field"><label>Teléfono</label><input className="zoho-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
          <div className="zoho-form-field"><label>Campaña</label><input className="zoho-input" value={form.campaign} onChange={(event) => setForm({ ...form, campaign: event.target.value })} /></div>
          <div className="zoho-form-field"><label>Contrato activo</label><input className="zoho-input" value={form.active_contract} onChange={(event) => setForm({ ...form, active_contract: event.target.value })} /></div>
        </aside>

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar"><span>Registros totales {filtered.length}</span></div>
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>Sin mandantes creados.</td></tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.owner_name || "—"}</td>
                    <td>{row.email || "—"}</td>
                    <td>{row.phone || "—"}</td>
                    <td>{row.active_contract || "—"}</td>
                    <td>{row._count?.managements ?? 0}</td>
                    <td>{row._count?.companies ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
