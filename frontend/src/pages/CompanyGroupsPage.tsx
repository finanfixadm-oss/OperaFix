import { useEffect, useMemo, useState } from "react";
import { fetchCompanyGroups, fetchMandantes, postJson } from "../api";
import type { CompanyGroup, Mandante } from "../types";

export default function CompanyGroupsPage() {
  const [rows, setRows] = useState<CompanyGroup[]>([]);
  const [mandantes, setMandantes] = useState<Mandante[]>([]);
  const [kind, setKind] = useState("LM");
  const [mandanteId, setMandanteId] = useState("");
  const [form, setForm] = useState({ name: "", owner_name: "", campaign_name: "", secondary_email: "" });

  const load = () => fetchCompanyGroups({ kind, mandante_id: mandanteId || undefined }).then(setRows).catch(() => setRows([]));
  useEffect(() => { fetchMandantes().then(setMandantes).catch(() => setMandantes([])); }, []);
  useEffect(() => { load(); }, [kind, mandanteId]);

  const selectedMandante = useMemo(() => mandantes.find((m) => m.id === mandanteId), [mandantes, mandanteId]);

  async function createGroup() {
    if (!mandanteId || !form.name.trim()) return;
    await postJson("/company-groups", { mandante_id: mandanteId, kind, ...form });
    setForm({ name: "", owner_name: "", campaign_name: "", secondary_email: "" });
    load();
  }

  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Jerarquía base</span><h2 className="page-title">Grupos de empresas</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Vista</button><button className="ghost-btn">Filtros</button><button className="primary-btn" onClick={createGroup}>Crear Grupo</button></div>
      </div>
      <div className="zoho-layout single-detailless">
        <aside className="filter-panel">
          <div className="panel-title-row"><h3>Configuración</h3></div>
          <label className="field-block"><span>Mandante</span><select value={mandanteId} onChange={(e)=>setMandanteId(e.target.value)}><option value="">Selecciona</option>{mandantes.map((m)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label className="field-block"><span>Tipo</span><select value={kind} onChange={(e)=>setKind(e.target.value)}><option value="LM">LM</option><option value="TP">TP</option></select></label>
          <label className="field-block"><span>Nombre grupo</span><input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} /></label>
          <label className="field-block"><span>Propietario</span><input value={form.owner_name} onChange={(e)=>setForm({ ...form, owner_name: e.target.value })} /></label>
          <label className="field-block"><span>Campaña</span><input value={form.campaign_name} onChange={(e)=>setForm({ ...form, campaign_name: e.target.value })} /></label>
          <label className="field-block"><span>Correo secundario</span><input value={form.secondary_email} onChange={(e)=>setForm({ ...form, secondary_email: e.target.value })} /></label>
        </aside>
        <section className="table-panel wide-panel">
          <div className="panel-title-row"><h3>{selectedMandante ? `${selectedMandante.name} · ${kind}` : 'Listado'}</h3><span className="records-counter">{rows.length} grupos</span></div>
          <div className="table-scroll">
            <table className="crm-table enhanced">
              <thead><tr><th>Grupo</th><th>Mandante</th><th>Tipo</th><th>Propietario</th><th>Empresas</th><th>Líneas</th></tr></thead>
              <tbody>{rows.length===0 ? <tr><td colSpan={6}>Sin registros</td></tr> : rows.map((row)=><tr key={row.id}><td>{row.name}</td><td>{row.mandante?.name || '-'}</td><td>{row.kind}</td><td>{row.owner_name || '-'}</td><td>{row._count?.companies ?? 0}</td><td>{row._count?.managementLines ?? 0}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
