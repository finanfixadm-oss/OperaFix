import { useEffect, useMemo, useState } from "react";
import { fetchTpGroups } from "../api";
import type { TpGroup } from "../types";

export default function TpGroupsPage() {
  const [rows, setRows] = useState<TpGroup[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => { fetchTpGroups().then(setRows).catch(() => setRows([])); }, []);
  const filtered = useMemo(() => rows.filter((r) => [r.name, r.email, r.groups_related, r.mandante].join(' ').toLowerCase().includes(search.toLowerCase())), [rows, search]);
  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Actividades</span><h2 className="page-title">Grupos empresas - TP</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Filtrar</button><button className="ghost-btn">Ordenar</button><button className="primary-btn">Crear Grupo de empresa - TP</button></div>
      </div>
      <div className="zoho-layout single-detailless">
        <aside className="filter-panel"><label className="field-block"><span>Buscar</span><input value={search} onChange={(e)=>setSearch(e.target.value)} /></label></aside>
        <section className="table-panel wide-panel"><div className="panel-title-row"><h3>Listado</h3><span className="records-counter">{filtered.length} registros</span></div><div className="table-scroll"><table className="crm-table enhanced"><thead><tr><th>Nombre grupo</th><th>Mandante</th><th>Correo</th><th>Grupos asociados</th></tr></thead><tbody>{filtered.length===0?<tr><td colSpan={4}>Sin registros</td></tr>:filtered.map((r)=><tr key={r.id}><td>{r.name}</td><td>{r.mandante || '-'}</td><td>{r.email || '-'}</td><td>{r.groups_related || '-'}</td></tr>)}</tbody></table></div></section>
      </div>
    </div>
  );
}
