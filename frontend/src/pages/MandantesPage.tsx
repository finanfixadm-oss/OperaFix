import { useEffect, useMemo, useState } from "react";
import ZohoModal from "../components/ZohoModal";
import { fetchJson, postJson } from "../api";

type Mandante = {
  id: string;
  name: string;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  active_contract?: string | null;
  end_contract_date?: string | null;
  _count?: { groups?: number; companies?: number; managements?: number };
};

const emptyForm = {
  name: "",
  owner_name: "",
  email: "",
  phone: "",
  active_contract: "Vigente",
  end_contract_date: "",
};

export default function MandantesPage() {
  const [rows, setRows] = useState<Mandante[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const data = await fetchJson<Mandante[]>("/mandantes");
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((row) => [row.name, row.owner_name, row.email, row.phone].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  function updateForm(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createMandante() {
    if (!form.name.trim()) {
      alert("Debes ingresar el nombre del mandante.");
      return;
    }

    setSaving(true);
    try {
      await postJson("/mandantes", form);
      setModalOpen(false);
      setForm(emptyForm);
      await load();
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
          <p>Base de clientes mandantes para asociar registros de empresas</p>
        </div>
        <div className="zoho-module-actions">
          <button className="zoho-btn zoho-btn-primary" onClick={() => setModalOpen(true)}>Crear mandante</button>
        </div>
      </div>

      <div className="zoho-module-layout">
        <aside className="zoho-filter-panel">
          <div className="zoho-filter-title">Filtrar Mandantes</div>
          <input className="zoho-input" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        </aside>

        <section className="zoho-table-wrap">
          <div className="zoho-table-toolbar"><span>Mandantes totales {filtered.length}</span></div>
          <table className="zoho-table">
            <thead>
              <tr><th>Mandante</th><th>Propietario</th><th>Email</th><th>Teléfono</th><th>Contrato</th><th>Término contrato</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6}>Sin mandantes creados.</td></tr> : filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.owner_name || "—"}</td>
                  <td>{row.email || "—"}</td>
                  <td>{row.phone || "—"}</td>
                  <td>{row.active_contract || "—"}</td>
                  <td>{row.end_contract_date ? new Date(row.end_contract_date).toLocaleDateString("es-CL") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <ZohoModal title="Crear mandante" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="zoho-form-grid">
          <Field label="Nombre mandante"><input className="zoho-input" value={form.name} onChange={(e) => updateForm("name", e.target.value)} /></Field>
          <Field label="Propietario"><input className="zoho-input" value={form.owner_name} onChange={(e) => updateForm("owner_name", e.target.value)} /></Field>
          <Field label="Email"><input className="zoho-input" value={form.email} onChange={(e) => updateForm("email", e.target.value)} /></Field>
          <Field label="Teléfono"><input className="zoho-input" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} /></Field>
          <Field label="Contrato"><select className="zoho-select" value={form.active_contract} onChange={(e) => updateForm("active_contract", e.target.value)}><option>Vigente</option><option>No vigente</option><option>Pendiente</option></select></Field>
          <Field label="Fecha término contrato"><input className="zoho-input" type="date" value={form.end_contract_date} onChange={(e) => updateForm("end_contract_date", e.target.value)} /></Field>
        </div>
        <div className="zoho-form-actions"><button className="zoho-btn" onClick={() => setModalOpen(false)}>Cancelar</button><button className="zoho-btn zoho-btn-primary" onClick={createMandante} disabled={saving}>{saving ? "Guardando..." : "Guardar mandante"}</button></div>
      </ZohoModal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="zoho-form-field"><label>{label}</label>{children}</div>;
}
