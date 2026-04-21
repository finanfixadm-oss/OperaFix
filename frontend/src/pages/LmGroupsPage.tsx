import { useEffect, useMemo, useState } from "react";
import { fetchLmGroups } from "../api";
import type { LmGroup } from "../types";

export default function LmGroupsPage() {
  const [rows, setRows] = useState<LmGroup[]>([]);
  const [search, setSearch] = useState("");
  const [mandante, setMandante] = useState("");

  useEffect(() => {
    fetchLmGroups().then(setRows).catch(() => setRows([]));
  }, []);

  const mandantes = useMemo(() => Array.from(new Set(rows.map((r) => r.mandante).filter(Boolean))) as string[], [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const matchesText = !search || [row.name, row.secondary_email, row.groups_related].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesMandante = !mandante || row.mandante === mandante;
    return matchesText && matchesMandante;
  }), [rows, search, mandante]);

  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Ventas</span><h2 className="page-title">Grupos de empresas - LM</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Filtrar</button><button className="ghost-btn">Ordenar</button><button className="primary-btn">Crear Grupo de empresa - LM</button></div>
      </div>
      <div className="zoho-layout single-detailless">
        <aside className="filter-panel">
          <div className="panel-title-row"><h3>Filtrar Grupos</h3></div>
          <label className="field-block"><span>Buscar</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar" /></label>
          <label className="field-block"><span>Mandante</span><select value={mandante} onChange={(e)=>setMandante(e.target.value)}><option value="">Todos</option>{mandantes.map((m)=><option key={m} value={m}>{m}</option>)}</select></label>
        </aside>
        <section className="table-panel wide-panel">
          <div className="panel-title-row"><h3>Listado</h3><span className="records-counter">{filtered.length} registros</span></div>
          <div className="table-scroll">
            <table className="crm-table enhanced">
              <thead><tr><th>Nombre grupo</th><th>Mandante</th><th>Correo secundario</th><th>Grupos asociados</th><th>Modificación</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}>Sin registros</td></tr> : filtered.map((row)=><tr key={row.id}><td>{row.name}</td><td>{row.mandante || '-'}</td><td>{row.secondary_email || '-'}</td><td>{row.groups_related || '-'}</td><td>{row.updated_at ? new Date(row.updated_at).toLocaleString('es-CL') : '-'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
