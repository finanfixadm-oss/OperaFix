import { useEffect, useMemo, useState } from "react";
import { fetchTpRecords } from "../api";
import type { TpRecord } from "../types";

export default function TpRecordsPage() {
  const [rows, setRows] = useState<TpRecord[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => { fetchTpRecords().then(setRows).catch(() => setRows([])); }, []);
  const filtered = useMemo(() => rows.filter((r) => [r.mandante, r.portal_access, r.client_contract_status, r.comment, r.cen_query].join(' ').toLowerCase().includes(search.toLowerCase())), [rows, search]);
  return (
    <div className="zoho-page">
      <div className="page-toolbar">
        <div><span className="eyebrow">Trabajo Pesado</span><h2 className="page-title">Gestiones - TP</h2></div>
        <div className="toolbar-actions"><button className="ghost-btn">Filtrar</button><button className="ghost-btn">Ordenar</button><button className="primary-btn">Nueva gestión TP</button></div>
      </div>
      <div className="zoho-layout single-detailless">
        <aside className="filter-panel"><label className="field-block"><span>Buscar</span><input value={search} onChange={(e)=>setSearch(e.target.value)} /></label></aside>
        <section className="table-panel wide-panel"><div className="panel-title-row"><h3>Listado</h3><span className="records-counter">{filtered.length} registros</span></div><div className="table-scroll"><table className="crm-table enhanced"><thead><tr><th>Mandante</th><th>Acceso portal</th><th>Estado contrato</th><th>Consulta CEN</th><th>Comentario</th></tr></thead><tbody>{filtered.length===0?<tr><td colSpan={5}>Sin registros</td></tr>:filtered.map((r)=><tr key={r.id}><td>{r.mandante || '-'}</td><td>{r.portal_access || '-'}</td><td>{r.client_contract_status || '-'}</td><td>{r.cen_query || '-'}</td><td>{r.comment || '-'}</td></tr>)}</tbody></table></div></section>
      </div>
    </div>
  );
}
