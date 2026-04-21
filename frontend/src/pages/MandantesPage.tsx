import { useEffect, useMemo, useState } from "react";
import { fetchMandantes, postJson } from "../api";
import type { Mandante } from "../types";

export default function MandantesPage() {
  const [rows, setRows] = useState<Mandante[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", code: "", owner_name: "", commercial_name: "" });

  const load = () => fetchMandantes().then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => [row.name, row.code, row.owner_name, row.commercial_name].join(" ").toLowerCase().includes(search.toLowerCase())), [rows, search]);

  async function createMandante() {
    if (!form.name.trim()) return;
    await postJson("/mandantes", form);
    setForm({ name: "", code: "", owner_name: "", commercial_name: "" });
    load();
  }

  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Base jerárquica</span><h2 className="page-title">Mandantes</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Importar</button><button className="ghost-btn">Exportar</button><button className="primary-btn" onClick={createMandante}>Crear Mandante</button></div>
      </div>
      <div className="zoho-layout single-detailless">
        <aside className="filter-panel">
          <div className="panel-title-row"><h3>Nuevo mandante</h3></div>
          <label className="field-block"><span>Buscar</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar mandante" /></label>
          <label className="field-block"><span>Nombre</span><input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} /></label>
          <label className="field-block"><span>Código</span><input value={form.code} onChange={(e)=>setForm({ ...form, code: e.target.value })} /></label>
          <label className="field-block"><span>Propietario</span><input value={form.owner_name} onChange={(e)=>setForm({ ...form, owner_name: e.target.value })} /></label>
          <label className="field-block"><span>Nombre comercial</span><input value={form.commercial_name} onChange={(e)=>setForm({ ...form, commercial_name: e.target.value })} /></label>
        </aside>
        <section className="table-panel wide-panel">
          <div className="panel-title-row"><h3>Listado</h3><span className="records-counter">{filtered.length} registros</span></div>
          <div className="table-scroll">
            <table className="crm-table enhanced">
              <thead><tr><th>Mandante</th><th>Código</th><th>Propietario</th><th>Nombre comercial</th><th>Grupos</th><th>Empresas</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={6}>Sin registros</td></tr> : filtered.map((row)=><tr key={row.id}><td>{row.name}</td><td>{row.code || '-'}</td><td>{row.owner_name || '-'}</td><td>{row.commercial_name || '-'}</td><td>{row._count?.groups ?? 0}</td><td>{row._count?.companies ?? 0}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
